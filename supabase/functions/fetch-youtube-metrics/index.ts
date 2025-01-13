import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting YouTube metrics fetch function');
    
    // Get environment variables
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!YOUTUBE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all YouTube channels
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('*')
      .eq('platform', 'youtube');

    if (channelsError) {
      console.error('Error fetching channels:', channelsError);
      throw channelsError;
    }

    console.log('Found YouTube channels:', channels);

    if (channels.length === 0) {
      console.log('No YouTube channels found');
      return new Response(
        JSON.stringify({ message: 'No YouTube channels to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each channel
    for (const channel of channels) {
      try {
        console.log(`Processing channel ${channel.channel_name}`);
        
        // Search for the channel to get channel ID
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&q=${channel.channel_name}&type=channel&key=${YOUTUBE_API_KEY}`;
        console.log('Searching channel with URL:', searchUrl);
        
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();
        
        console.log('Search response:', searchData);

        if (!searchData.items?.length) {
          console.log(`No channel found for ${channel.channel_name}`);
          continue;
        }

        const channelId = searchData.items[0].id.channelId;
        console.log(`Found channel ID: ${channelId}`);

        // Get live streams for the channel
        const liveUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`;
        console.log('Checking live streams with URL:', liveUrl);
        
        const liveResponse = await fetch(liveUrl);
        const liveData = await liveResponse.json();
        
        console.log('Live stream response:', liveData);

        let isLive = false;
        let viewersCount = 0;

        if (liveData.items?.length > 0) {
          const videoId = liveData.items[0].id.videoId;
          console.log(`Found live video ID: ${videoId}`);

          // Get live stream details
          const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`;
          console.log('Fetching stream stats with URL:', statsUrl);
          
          const statsResponse = await fetch(statsUrl);
          const statsData = await statsResponse.json();
          
          console.log('Stream stats response:', statsData);

          if (statsData.items?.length > 0) {
            isLive = true;
            viewersCount = parseInt(statsData.items[0].liveStreamingDetails?.concurrentViewers || '0');
          }
        }

        // Update metrics in database
        console.log(`Updating metrics for ${channel.channel_name}:`, {
          isLive,
          viewersCount
        });

        const { error: metricsError } = await supabase
          .from('metrics')
          .insert({
            channel_id: channel.id,
            viewers_count: viewersCount,
            is_live: isLive,
            timestamp: new Date().toISOString()
          });

        if (metricsError) {
          console.error(`Error inserting metrics for ${channel.channel_name}:`, metricsError);
          continue;
        }

        // Update channel peak viewers if necessary
        if (viewersCount > channel.peak_viewers_count) {
          const { error: updateError } = await supabase
            .from('channels')
            .update({ peak_viewers_count: viewersCount })
            .eq('id', channel.id);

          if (updateError) {
            console.error(`Error updating peak viewers for ${channel.channel_name}:`, updateError);
          } else {
            console.log(`Updated peak viewers for ${channel.channel_name} to ${viewersCount}`);
          }
        }

      } catch (error) {
        console.error(`Error processing channel ${channel.channel_name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ message: 'Metrics updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-youtube-metrics function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});