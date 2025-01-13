import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchYouTubeMetrics(channel: any, YOUTUBE_API_KEY: string) {
  console.log(`[${new Date().toISOString()}] Iniciando busca de métricas para canal: ${channel.channel_name}`);
  
  try {
    let channelId = channel.channel_name;
    if (channel.channel_name.startsWith('@')) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channel.channel_name)}&key=${YOUTUBE_API_KEY}`;
      console.log(`[${new Date().toISOString()}] Buscando canal:`, channel.channel_name);
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      const searchData = await searchResponse.json();
      
      if (!searchResponse.ok) {
        // Verifica especificamente o erro de API desabilitada
        if (searchData.error?.status === "PERMISSION_DENIED" && 
            searchData.error?.message?.includes("API") && 
            searchData.error?.message?.includes("disabled")) {
          console.error(`[${new Date().toISOString()}] YouTube API está desabilitada:`, searchData.error);
          throw new Error("YouTube API não está habilitada. Por favor, habilite em: " + 
            searchData.error?.details?.[0]?.metadata?.activationUrl || 
            "https://console.developers.google.com/apis/api/youtube.googleapis.com/overview");
        }
        
        console.error(`[${new Date().toISOString()}] Erro na busca do canal:`, searchData);
        throw new Error(`Falha ao buscar canal: ${JSON.stringify(searchData)}`);
      }
      
      if (!searchData.items?.length) {
        console.log(`[${new Date().toISOString()}] Nenhum canal encontrado para ${channel.channel_name}`);
        return { isLive: false, viewersCount: 0 };
      }
      
      channelId = searchData.items[0].id.channelId;
      console.log(`[${new Date().toISOString()}] ID do canal encontrado:`, channelId);
    }

    const liveUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`;
    console.log(`[${new Date().toISOString()}] Verificando streams ao vivo para canal ${channel.channel_name}`);
    
    const liveResponse = await fetch(liveUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    if (!liveResponse.ok) {
      const errorData = await liveResponse.json();
      console.error(`[${new Date().toISOString()}] Erro ao verificar status ao vivo:`, errorData);
      throw new Error(`Falha ao verificar status ao vivo: ${JSON.stringify(errorData)}`);
    }
    
    const liveData = await liveResponse.json();
    console.log(`[${new Date().toISOString()}] Resposta da verificação ao vivo:`, liveData);

    if (!liveData.items?.length) {
      console.log(`[${new Date().toISOString()}] Nenhuma stream ao vivo encontrada para ${channel.channel_name}`);
      return { isLive: false, viewersCount: 0 };
    }

    const videoId = liveData.items[0].id.videoId;
    console.log(`[${new Date().toISOString()}] ID do vídeo ao vivo encontrado para ${channel.channel_name}:`, videoId);
    
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;
    console.log(`[${new Date().toISOString()}] Buscando estatísticas da stream`);
    
    const statsResponse = await fetch(statsUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    if (!statsResponse.ok) {
      const errorData = await statsResponse.json();
      console.error(`[${new Date().toISOString()}] Erro ao buscar estatísticas da stream:`, errorData);
      throw new Error(`Falha ao buscar estatísticas da stream: ${JSON.stringify(errorData)}`);
    }
    
    const statsData = await statsResponse.json();
    console.log(`[${new Date().toISOString()}] Resposta das estatísticas da stream:`, statsData);

    if (!statsData.items?.length) {
      console.log(`[${new Date().toISOString()}] Nenhuma estatística encontrada para ${channel.channel_name}`);
      return { isLive: false, viewersCount: 0 };
    }

    const viewersCount = parseInt(statsData.items[0].liveStreamingDetails?.concurrentViewers || '0');
    console.log(`[${new Date().toISOString()}] Canal ${channel.channel_name} tem ${viewersCount} espectadores`);
    return { isLive: true, viewersCount };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro processando canal ${channel.channel_name}:`, error);
    
    if (error instanceof Error && 
        error.message.includes("YouTube API não está habilitada")) {
      throw error;
    }
    
    throw error;
  }
}

serve(async (req) => {
  console.log('[YouTube Metrics] Iniciando execução da função');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      throw new Error('Variável de ambiente YOUTUBE_API_KEY não encontrada');
    }

    console.log('Buscando canais do YouTube no banco de dados...');
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

    console.log(`Encontrados ${channels?.length || 0} canais do YouTube`);

    if (!channels || channels.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum canal do YouTube para processar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processando canais...');
    const results = await Promise.all(channels.map(async (channel) => {
      try {
        console.log(`Processando canal: ${channel.channel_name}`);
        const metrics = await fetchYouTubeMetrics(channel, YOUTUBE_API_KEY);
        
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

    console.log('Resultados do processamento dos canais:', results);
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
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isApiDisabled = errorMessage.includes("YouTube API não está habilitada");
    
    return new Response(
      JSON.stringify({ 
        error: isApiDisabled ? {
          message: "YouTube API não está habilitada",
          details: "Por favor, habilite a YouTube Data API v3 no Console do Google Cloud e aguarde alguns minutos para as alterações serem propagadas.",
          activationUrl: "https://console.developers.google.com/apis/api/youtube.googleapis.com/overview"
        } : errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: isApiDisabled ? 503 : 500 
      }
    );
  }
});