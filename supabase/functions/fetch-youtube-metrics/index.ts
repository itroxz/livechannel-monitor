import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function validateYouTubeChannel(channelName: string, apiKey: string) {
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

async function fetchLiveStreamData(channelId: string, apiKey: string) {
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
  
  const viewersCount = parseInt(statsData.items[0].liveStreamingDetails?.concurrentViewers || '0');
  console.log(`[${new Date().toISOString()}] Número de espectadores:`, viewersCount);
  
  return { isLive: true, viewersCount };
}

serve(async (req) => {
  console.log('[YouTube Metrics] Iniciando execução da função');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      throw new Error('Chave da API do YouTube não encontrada nas variáveis de ambiente');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('*')
      .eq('platform', 'youtube');

    if (channelsError) {
      console.error('Erro ao buscar canais:', channelsError);
      throw channelsError;
    }

    console.log(`Processando ${channels?.length || 0} canais do YouTube`);

    if (!channels || channels.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum canal do YouTube para processar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = await Promise.all(channels.map(async (channel) => {
      try {
        console.log(`Processando canal: ${channel.channel_name}`);
        
        const channelId = await validateYouTubeChannel(channel.channel_name, YOUTUBE_API_KEY);
        if (!channelId) {
          return { 
            channel: channel.channel_name, 
            success: false, 
            error: 'Canal não encontrado' 
          };
        }
        
        const metrics = await fetchLiveStreamData(channelId, YOUTUBE_API_KEY);
        
        if (metrics.isLive) {
          const { error: metricsError } = await supabase
            .from('metrics')
            .insert({
              channel_id: channel.id,
              viewers_count: metrics.viewersCount,
              is_live: metrics.isLive,
              timestamp: new Date().toISOString()
            });

          if (metricsError) {
            console.error(`Erro ao inserir métricas para ${channel.channel_name}:`, metricsError);
            throw metricsError;
          }
          
          console.log(`Canal ${channel.channel_name} tem ${metrics.viewersCount} espectadores`);
        }
        
        return { channel: channel.channel_name, success: true, metrics };
      } catch (error) {
        console.error(`Erro processando canal ${channel.channel_name}:`, error);
        return { 
          channel: channel.channel_name, 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }));

    return new Response(
      JSON.stringify({ 
        message: 'Métricas atualizadas com sucesso', 
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função fetch-youtube-metrics:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});