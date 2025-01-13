import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchYouTubeMetrics(channel: any, YOUTUBE_API_KEY: string) {
  console.log(`[${new Date().toISOString()}] Iniciando busca de métricas para canal: ${channel.channel_name}`);
  
  try {
    // 1. Primeiro encontrar o ID do canal
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&q=${encodeURIComponent(channel.channel_name)}&type=channel&key=${YOUTUBE_API_KEY}`;
    console.log(`Buscando ID do canal: ${channel.channel_name}`);
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`Erro na busca do canal ${channel.channel_name}:`, errorText);
      return { isLive: false, viewersCount: 0 };
    }
    
    const searchData = await searchResponse.json();
    console.log(`Resposta da busca do canal ${channel.channel_name}:`, searchData);
    
    if (!searchData.items?.length) {
      console.log(`Nenhum canal encontrado para ${channel.channel_name}`);
      return { isLive: false, viewersCount: 0 };
    }

    // 2. Com o ID do canal, procurar streams ao vivo
    const channelId = searchData.items[0].id.channelId;
    console.log(`ID do canal ${channel.channel_name}: ${channelId}`);

    const liveUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`;
    console.log(`Verificando streams ao vivo para ${channel.channel_name}`);
    
    const liveResponse = await fetch(liveUrl);
    if (!liveResponse.ok) {
      const errorText = await liveResponse.text();
      console.error(`Erro na busca de streams do canal ${channel.channel_name}:`, errorText);
      return { isLive: false, viewersCount: 0 };
    }
    
    const liveData = await liveResponse.json();
    console.log(`Resposta da busca de streams para ${channel.channel_name}:`, liveData);

    if (!liveData.items?.length) {
      console.log(`Nenhuma stream ao vivo encontrada para ${channel.channel_name}`);
      return { isLive: false, viewersCount: 0 };
    }

    // 3. Com o ID do vídeo ao vivo, buscar estatísticas
    const videoId = liveData.items[0].id.videoId;
    console.log(`ID do vídeo ao vivo de ${channel.channel_name}: ${videoId}`);

    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
    console.log(`Buscando estatísticas da stream de ${channel.channel_name}`);
    
    const statsResponse = await fetch(statsUrl);
    if (!statsResponse.ok) {
      const errorText = await statsResponse.text();
      console.error(`Erro na busca de estatísticas do canal ${channel.channel_name}:`, errorText);
      return { isLive: false, viewersCount: 0 };
    }
    
    const statsData = await statsResponse.json();
    console.log(`Resposta das estatísticas para ${channel.channel_name}:`, statsData);

    if (!statsData.items?.length) {
      console.log(`Nenhuma estatística encontrada para ${channel.channel_name}`);
      return { isLive: false, viewersCount: 0 };
    }

    const viewersCount = parseInt(statsData.items[0].liveStreamingDetails?.concurrentViewers || '0');
    console.log(`Canal ${channel.channel_name} está ao vivo com ${viewersCount} espectadores`);
    return { isLive: true, viewersCount };
  } catch (error) {
    console.error(`Erro ao buscar métricas para o canal ${channel.channel_name}:`, error);
    return { isLive: false, viewersCount: 0 };
  }
}

async function updateMetricsInDatabase(channel: any, metrics: any, supabase: any) {
  console.log(`Atualizando métricas para o canal ${channel.channel_name}:`, metrics);
  
  try {
    const { error } = await supabase
      .from('metrics')
      .insert({
        channel_id: channel.id,
        viewers_count: metrics.viewersCount,
        is_live: metrics.isLive,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error(`Erro ao inserir métricas para ${channel.channel_name}:`, error);
      throw error;
    }
    
    console.log(`Métricas atualizadas com sucesso para ${channel.channel_name}`);
  } catch (error) {
    console.error(`Erro no banco de dados para ${channel.channel_name}:`, error);
    throw error;
  }
}

serve(async (req) => {
  console.log('Iniciando função de busca de métricas do YouTube');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!YOUTUBE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Variáveis de ambiente faltando:', {
        hasYoutubeKey: !!YOUTUBE_API_KEY,
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
      });
      throw new Error('Variáveis de ambiente necessárias não encontradas');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('Buscando canais do YouTube no banco de dados...');
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
        console.log(`Iniciando processamento do canal: ${channel.channel_name}`);
        const metrics = await fetchYouTubeMetrics(channel, YOUTUBE_API_KEY);
        await updateMetricsInDatabase(channel, metrics, supabase);
        return { channel: channel.channel_name, success: true };
      } catch (error) {
        console.error(`Erro ao processar canal ${channel.channel_name}:`, error);
        return { channel: channel.channel_name, success: false, error: error.message };
      }
    }));

    console.log('Resultados do processamento:', results);
    return new Response(
      JSON.stringify({ message: 'Métricas atualizadas com sucesso', results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função fetch-youtube-metrics:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});