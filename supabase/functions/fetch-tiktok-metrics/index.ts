import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { WebcastPushConnection } from 'https://esm.sh/tiktok-live-connector';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch all TikTok channels
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('*')
      .eq('platform', 'tiktok');

    if (channelsError) {
      throw channelsError;
    }

    console.log('Found TikTok channels:', channels);

    // Process each channel
    for (const channel of channels) {
      try {
        console.log(`Processing channel ${channel.channel_name}`);
        
        // Connect to TikTok LIVE
        const tiktokConnection = new WebcastPushConnection(channel.channel_name);

        // Wait for connection to be established
        await new Promise((resolve, reject) => {
          tiktokConnection.connect().then(() => {
            console.log(`Connected to ${channel.channel_name}'s livestream`);
            
            // Get viewer count
            const viewerCount = tiktokConnection.getViewerCount();
            console.log(`Current viewers for ${channel.channel_name}: ${viewerCount}`);

            // Insert metrics
            supabase.from('metrics').insert({
              channel_id: channel.id,
              viewers_count: viewerCount,
              is_live: true,
              timestamp: new Date().toISOString()
            }).then(({ error }) => {
              if (error) {
                console.error(`Error inserting metrics for ${channel.channel_name}:`, error);
              }
              tiktokConnection.disconnect();
              resolve(true);
            });

          }).catch((err) => {
            console.log(`Channel ${channel.channel_name} is not live:`, err);
            // Insert offline status
            supabase.from('metrics').insert({
              channel_id: channel.id,
              viewers_count: 0,
              is_live: false,
              timestamp: new Date().toISOString()
            }).then(({ error }) => {
              if (error) {
                console.error(`Error inserting offline metrics for ${channel.channel_name}:`, error);
              }
              resolve(false);
            });
          });
        });

      } catch (error) {
        console.error(`Error processing channel ${channel.channel_name}:`, error);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in TikTok metrics function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});