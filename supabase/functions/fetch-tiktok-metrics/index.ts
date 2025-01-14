import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { WebcastPushConnection } from 'npm:tiktok-live-connector'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('[TikTok Metrics] Iniciando execução da função');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('*')
      .eq('platform', 'tiktok');

    if (channelsError) {
      console.error('Erro ao buscar canais:', channelsError);
      throw channelsError;
    }

    console.log(`Processando ${channels?.length || 0} canais do TikTok`);

    if (!channels || channels.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum canal do TikTok para processar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = await Promise.all(channels.map(async (channel) => {
      try {
        console.log(`Processando canal: ${channel.channel_name}`);
        
        const tiktokConnection = new WebcastPushConnection(channel.channel_name);
        
        try {
          await tiktokConnection.connect();
          console.log(`Conectado ao canal ${channel.channel_name}`);
          
          // Aguarda alguns segundos para receber os dados iniciais
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const roomInfo = tiktokConnection.getRoomInfo();
          const viewerCount = roomInfo?.viewerCount || 0;
          
          // Inserir métrica
          const { error: metricsError } = await supabase
            .from('metrics')
            .insert({
              channel_id: channel.id,
              viewers_count: viewerCount,
              is_live: true,
              timestamp: new Date().toISOString()
            });

          if (metricsError) {
            console.error(`Erro ao inserir métricas para ${channel.channel_name}:`, metricsError);
            throw metricsError;
          }

          // Atualizar peak_viewers se necessário
          if (viewerCount > (channel.peak_viewers_count || 0)) {
            const { error: updateError } = await supabase
              .from('channels')
              .update({ 
                peak_viewers_count: viewerCount,
                peak_viewers_timestamp: new Date().toISOString()
              })
              .eq('id', channel.id);

            if (updateError) {
              console.error(`Erro ao atualizar peak_viewers para ${channel.channel_name}:`, updateError);
              throw updateError;
            }
          }

          tiktokConnection.disconnect();
          
          return {
            channel: channel.channel_name,
            success: true,
            metrics: {
              viewerCount,
              isLive: true
            }
          };
        } catch (error) {
          console.error(`Erro ao conectar com canal ${channel.channel_name}:`, error);
          
          // Se não conseguir conectar, assume que está offline
          const { error: metricsError } = await supabase
            .from('metrics')
            .insert({
              channel_id: channel.id,
              viewers_count: 0,
              is_live: false,
              timestamp: new Date().toISOString()
            });

          if (metricsError) {
            console.error(`Erro ao inserir métrica offline para ${channel.channel_name}:`, metricsError);
          }

          return {
            channel: channel.channel_name,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
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
    console.error('Erro na função fetch-tiktok-metrics:', error);
    
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