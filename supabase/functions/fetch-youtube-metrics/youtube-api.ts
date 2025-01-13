// ... keep existing code (imports and other functions)

export async function validateYouTubeChannel(channelName: string, apiKey: string) {
  console.log(`[${new Date().toISOString()}] Validando canal do YouTube: ${channelName}`);
  
  let channelId = channelName;
  if (channelName.startsWith('@')) {
    const cacheKey = `channel_${channelName}`;
    const cached = cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION * 2) {
      console.log(`[${new Date().toISOString()}] Usando ID do canal em cache para ${channelName}`);
      return cached.data;
    }

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelName)}&key=${apiKey}`;
    console.log(`[${new Date().toISOString()}] URL de busca do canal:`, searchUrl);
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchResponse.ok) {
      console.error(`[${new Date().toISOString()}] Erro na busca do canal:`, searchData);
      throw new Error(`Falha ao buscar canal: ${JSON.stringify(searchData)}`);
    }
    
    if (!searchData.items?.length) {
      console.log(`[${new Date().toISOString()}] Canal não encontrado: ${channelName}`);
      return null;
    }
    
    channelId = searchData.items[0].id.channelId;
    console.log(`[${new Date().toISOString()}] ID do canal encontrado:`, channelId);
    
    // Cache the channel ID for twice as long as metrics
    cache.set(cacheKey, {
      data: channelId,
      timestamp: Date.now()
    });
  }
  
  return channelId;
}

export async function fetchLiveStreamData(channelId: string, apiKey: string) {
  const cacheKey = `live_${channelId}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);

  // Verificar cache com tempo de expiração dinâmico baseado no status da live
  if (cached) {
    const cacheDuration = cached.data.isLive ? CACHE_DURATION : CACHE_DURATION * 2;
    if ((now - cached.timestamp) < cacheDuration) {
      console.log(`[${new Date().toISOString()}] Usando dados em cache para canal ${channelId}`);
      console.log('Dados do cache:', cached.data);
      return cached.data;
    }
  }

  console.log(`[${new Date().toISOString()}] Cache expirado ou não encontrado para ${channelId}, buscando dados novos`);
  
  // Buscar todas as lives ativas do canal usando maxResults=50 para reduzir chamadas
  const liveUrl = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&eventType=live&type=video&maxResults=50&key=${apiKey}`;
  console.log(`[${new Date().toISOString()}] URL da busca de live:`, liveUrl);
  
  const liveResponse = await fetch(liveUrl);
  const liveData = await liveResponse.json();
  
  if (!liveResponse.ok) {
    console.error(`[${new Date().toISOString()}] Erro ao buscar status da live:`, liveData);
    throw new Error(`Falha ao verificar status da live: ${JSON.stringify(liveData)}`);
  }
  
  if (!liveData.items?.length) {
    console.log(`[${new Date().toISOString()}] Nenhuma live encontrada para o canal ${channelId}`);
    const result = { isLive: false, viewersCount: 0 };
    
    // Cache por mais tempo quando não está ao vivo
    cache.set(cacheKey, {
      data: result,
      timestamp: now
    });
    
    return result;
  }

  // Otimização: Buscar estatísticas de múltiplos vídeos em uma única chamada
  const videoIds = liveData.items.map((item: any) => item.id.videoId).join(',');
  console.log(`[${new Date().toISOString()}] IDs dos vídeos encontrados:`, videoIds);
  
  const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoIds}&key=${apiKey}`;
  const statsResponse = await fetch(statsUrl);
  const statsData = await statsResponse.json();
  
  if (!statsResponse.ok || !statsData.items?.length) {
    console.error(`[${new Date().toISOString()}] Erro ao buscar estatísticas:`, statsData);
    return { isLive: false, viewersCount: 0 };
  }
  
  // Somar os espectadores de todas as lives ativas
  const totalViewers = statsData.items.reduce((sum: number, video: any) => {
    const viewers = parseInt(video.liveStreamingDetails?.concurrentViewers || '0');
    console.log(`[${new Date().toISOString()}] Live ${video.id} tem ${viewers} espectadores`);
    return sum + viewers;
  }, 0);
  
  console.log(`[${new Date().toISOString()}] Total de ${totalViewers} espectadores em ${statsData.items.length} lives simultâneas`);
  
  const result = {
    isLive: true,
    viewersCount: totalViewers
  };

  // Cache por menos tempo quando está ao vivo
  cache.set(cacheKey, {
    data: result,
    timestamp: now
  });
  
  console.log(`[${new Date().toISOString()}] Dados armazenados no cache para ${channelId}:`, result);
  
  return result;
}

// Cache para armazenar resultados com duração variável
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 60000; // 60 segundos em milissegundos