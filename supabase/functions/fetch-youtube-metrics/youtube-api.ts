// ... keep existing code (imports and other functions)

export async function validateYouTubeChannel(channelName: string, apiKey: string) {
  console.log(`[${new Date().toISOString()}] Validando canal do YouTube: ${channelName}`);
  
  let channelId = channelName;
  if (channelName.startsWith('@')) {
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
  }
  
  return channelId;
}

export async function fetchLiveStreamData(channelId: string, apiKey: string) {
  console.log(`[${new Date().toISOString()}] Buscando dados da live para canal ID: ${channelId}`);
  
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
    return { isLive: false, viewersCount: 0 };
  }

  // Otimização: Buscar estatísticas de múltiplos vídeos em uma única chamada
  const videoIds = liveData.items.map((item: any) => item.id.videoId).join(',');
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
  
  return {
    isLive: true,
    viewersCount: totalViewers
  };
}

// Cache para armazenar resultados por 60 segundos
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 60000; // 60 segundos em milissegundos
