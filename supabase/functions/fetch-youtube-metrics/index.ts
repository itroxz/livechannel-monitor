import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateYouTubeChannel, fetchLiveStreamData } from './youtube-api.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
          // Inserir nova métrica
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

          // Atualizar peak_viewers_count no canal se necessário
          if (metrics.viewersCount > (channel.peak_viewers_count || 0)) {
            const { error: updateError } = await supabase
              .from('channels')
              .update({ peak_viewers_count: metrics.viewersCount })
              .eq('id', channel.id);

            if (updateError) {
              console.error(`Erro ao atualizar peak_viewers_count para ${channel.channel_name}:`, updateError);
              throw updateError;
            }
            
            console.log(`Atualizado peak_viewers_count para ${channel.channel_name}: ${metrics.viewersCount}`);
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