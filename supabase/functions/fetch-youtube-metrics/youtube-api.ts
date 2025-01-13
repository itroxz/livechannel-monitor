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
  
  const liveUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`;
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
  
  const videoId = liveData.items[0].id.videoId;
  console.log(`[${new Date().toISOString()}] ID do vídeo ao vivo:`, videoId);
  
  const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoId}&key=${apiKey}`;
  console.log(`[${new Date().toISOString()}] URL das estatísticas:`, statsUrl);
  
  const statsResponse = await fetch(statsUrl);
  const statsData = await statsResponse.json();
  
  if (!statsResponse.ok) {
    console.error(`[${new Date().toISOString()}] Erro ao buscar estatísticas:`, statsData);
    throw new Error(`Falha ao buscar estatísticas: ${JSON.stringify(statsData)}`);
  }
  
  if (!statsData.items?.length) {
    console.log(`[${new Date().toISOString()}] Nenhuma estatística encontrada`);
    return { isLive: false, viewersCount: 0 };
  }
  
  return {
    isLive: true,
    viewersCount: parseInt(statsData.items[0].liveStreamingDetails?.concurrentViewers || '0')
  };
}