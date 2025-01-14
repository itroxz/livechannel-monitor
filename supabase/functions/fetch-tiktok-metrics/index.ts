import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { WebcastPushConnection } from "https://esm.sh/tiktok-live-connector";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders 
    });
  }

  try {
    console.log('Starting TikTok metrics fetch...');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all TikTok channels
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('*')
      .eq('platform', 'tiktok');

    if (channelsError) {
      console.error('Error fetching TikTok channels:', channelsError);
      throw channelsError;
    }

    console.log('Found TikTok channels:', channels);

    if (!channels || channels.length === 0) {
      return new Response(
        JSON.stringify({ message: "No TikTok channels to process" }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each channel
    for (const channel of channels) {
      try {
        console.log(`Processing channel ${channel.channel_name}`);
        
        // Create TikTok connection with timeout
        const tiktokConnection = new WebcastPushConnection(channel.channel_name);
        
        try {
          // Set a timeout of 10 seconds for the connection
          await Promise.race([
            tiktokConnection.connect().then(() => {
              console.log(`Connected to ${channel.channel_name}'s livestream`);
              const viewerCount = tiktokConnection.getViewerCount();
              console.log(`Current viewers for ${channel.channel_name}: ${viewerCount}`);

              // Insert metrics
              return supabase.from('metrics').insert({
                channel_id: channel.id,
                viewers_count: viewerCount,
                is_live: true,
                timestamp: new Date().toISOString()
              });
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout')), 10000)
            )
          ]);
        } catch (error) {
          console.log(`Channel ${channel.channel_name} is not live:`, error);
          
          // Insert offline status
          await supabase.from('metrics').insert({
            channel_id: channel.id,
            viewers_count: 0,
            is_live: false,
            timestamp: new Date().toISOString()
          });
        } finally {
          // Always try to disconnect
          try {
            await tiktokConnection.disconnect();
          } catch (error) {
            console.error(`Error disconnecting from ${channel.channel_name}:`, error);
          }
        }

      } catch (error) {
        console.error(`Error processing channel ${channel.channel_name}:`, error);
        
        // Insert error status
        await supabase.from('metrics').insert({
          channel_id: channel.id,
          viewers_count: 0,
          is_live: false,
          timestamp: new Date().toISOString()
        });
      }
    }

    return new Response(
      JSON.stringify({ message: "Metrics updated successfully" }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in TikTok metrics function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});