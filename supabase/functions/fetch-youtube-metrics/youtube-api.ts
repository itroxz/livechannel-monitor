// Cache para armazenar resultados com duração variável
const cache = new Map<string, { data: any, timestamp: number }>();

// Configurações de cache
const CACHE_DURATIONS = {
  CHANNEL_ID: 24 * 60 * 60 * 1000, // 24 horas para IDs de canais
  LIVE_STATUS: {
    ONLINE: 1 * 60 * 1000,  // 1 minuto para canais online
    OFFLINE: 5 * 60 * 1000, // 5 minutos para canais offline
  }
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo
const BATCH_SIZE = 50; // Máximo de IDs por requisição

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Função genérica para gerenciar cache
function getFromCache<T>(key: string, duration: number): T | null {
  const item = cache.get(key) as CacheItem<T> | undefined;
  if (item && (Date.now() - item.timestamp) < duration) {
    console.log(`[${new Date().toISOString()}] Cache hit for ${key}`);
    return item.data;
  }
  return null;
}

function setInCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  console.log(`[${new Date().toISOString()}] Cache updated for ${key}`);
}

async function retryOperation<T>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (retries > 0 && (error?.status === 429 || error?.status === 503)) {
      console.log(`[${new Date().toISOString()}] Erro temporário, tentando novamente em ${RETRY_DELAY}ms. Tentativas restantes: ${retries}`);
      await sleep(RETRY_DELAY * (MAX_RETRIES - retries + 1)); // Backoff exponencial
      return retryOperation(operation, retries - 1);
    }
    throw error;
  }
}

// Função para processar canais em lotes
async function processBatch<T>(
  items: string[],
  processor: (batch: string[]) => Promise<T[]>,
  size = BATCH_SIZE
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }
  return results;
}

export async function validateYouTubeChannel(channelName: string, apiKey: string) {
  console.log(`[${new Date().toISOString()}] Validando canal do YouTube: ${channelName}`);
  
  // Se já é um ID de canal, retorna diretamente
  if (!channelName.startsWith('@')) {
    return channelName;
  }

  const cacheKey = `channel_${channelName}`;
  const cached = getFromCache<string>(cacheKey, CACHE_DURATIONS.CHANNEL_ID);
  if (cached) return cached;

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelName)}&key=${apiKey}&fields=items(id/channelId)`;
  console.log(`[${new Date().toISOString()}] URL de busca do canal:`, searchUrl);
  
  const searchResponse = await retryOperation(async () => {
    const response = await fetch(searchUrl);
    if (!response.ok) {
      const error = await response.json();
      console.error(`[${new Date().toISOString()}] Erro na busca do canal:`, error);
      throw new Error(`Falha ao buscar canal: ${JSON.stringify(error)}`);
    }
    return response;
  });

  const searchData = await searchResponse.json();
  
  if (!searchData.items?.length) {
    console.log(`[${new Date().toISOString()}] Canal não encontrado: ${channelName}`);
    return null;
  }
  
  const channelId = searchData.items[0].id.channelId;
  console.log(`[${new Date().toISOString()}] ID do canal encontrado:`, channelId);
  
  setInCache(cacheKey, channelId);
  return channelId;
}

export async function fetchLiveStreamData(channelId: string, apiKey: string) {
  const cacheKey = `live_${channelId}`;
  const cached = getFromCache<{ isLive: boolean, viewersCount: number }>(
    cacheKey,
    CACHE_DURATIONS.LIVE_STATUS.OFFLINE
  );
  if (cached) return cached;

  console.log(`[${new Date().toISOString()}] Buscando dados de live para canal ${channelId}`);
  
  // Buscar lives ativas com campos reduzidos
  const liveUrl = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&eventType=live&type=video&maxResults=50&key=${apiKey}&fields=items(id/videoId)`;
  
  const liveResponse = await retryOperation(async () => {
    const response = await fetch(liveUrl);
    if (!response.ok) {
      const error = await response.json();
      console.error(`[${new Date().toISOString()}] Erro ao buscar status da live:`, error);
      throw new Error(`Falha ao verificar status da live: ${JSON.stringify(error)}`);
    }
    return response;
  });

  const liveData = await liveResponse.json();
  
  if (!liveData.items?.length) {
    const result = { isLive: false, viewersCount: 0 };
    setInCache(cacheKey, result);
    return result;
  }

  // Processar vídeos em lotes
  const videoIds = liveData.items.map((item: any) => item.id.videoId);
  const statsData = await processBatch(videoIds, async (batch) => {
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${batch.join(',')}&key=${apiKey}&fields=items(liveStreamingDetails/concurrentViewers)`;
    const response = await retryOperation(async () => {
      const res = await fetch(statsUrl);
      if (!res.ok) {
        const error = await res.json();
        console.error(`[${new Date().toISOString()}] Erro ao buscar estatísticas:`, error);
        throw new Error(`Falha ao buscar estatísticas: ${JSON.stringify(error)}`);
      }
      return res;
    });
    return (await response.json()).items || [];
  });
  
  // Somar os espectadores de todas as lives ativas
  const totalViewers = statsData.reduce((sum: number, video: any) => {
    const viewers = parseInt(video.liveStreamingDetails?.concurrentViewers || '0');
    return sum + viewers;
  }, 0);
  
  const result = {
    isLive: true,
    viewersCount: totalViewers
  };

  // Cache mais curto para canais ao vivo
  setInCache(cacheKey, result);
  
  return result;
}