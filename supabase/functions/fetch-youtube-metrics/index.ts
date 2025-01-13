import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('YouTube metrics fetch function loaded');

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

    console.log('Checking environment variables...');
    if (!YOUTUBE_API_KEY) {
      throw new Error('YouTube API Key is not configured');
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }
    console.log('Environment variables verified successfully');

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log('Supabase client initialized');

    // Get all YouTube channels
    console.log('Fetching YouTube channels from database...');
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('*')
      .eq('platform', 'youtube');

    if (channelsError) {
      console.error('Error fetching channels:', channelsError);
      throw channelsError;
    }

    console.log(`Found ${channels?.length || 0} YouTube channels`);

    if (!channels || channels.length === 0) {
      console.log('No YouTube channels found in database');
      return new Response(
        JSON.stringify({ message: 'No YouTube channels to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each channel
    for (const channel of channels) {
      try {
        console.log(`Processing channel: ${channel.channel_name}`);
        
        // Search for the channel
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&q=${encodeURIComponent(channel.channel_name)}&type=channel&key=${YOUTUBE_API_KEY}`;
        console.log('Searching channel...');
        
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
          console.error('YouTube API search error:', await searchResponse.text());
          continue;
        }
        
        const searchData = await searchResponse.json();
        console.log('Search response:', searchData);

        if (!searchData.items?.length) {
          console.log(`No channel found for ${channel.channel_name}`);
          continue;
        }

        const channelId = searchData.items[0].id.channelId;
        console.log(`Found channel ID: ${channelId}`);

        // Get live streams
        const liveUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`;
        console.log('Checking live streams...');
        
        const liveResponse = await fetch(liveUrl);
        if (!liveResponse.ok) {
          console.error('YouTube API live stream error:', await liveResponse.text());
          continue;
        }
        
        const liveData = await liveResponse.json();
        console.log('Live stream response:', liveData);

        let isLive = false;
        let viewersCount = 0;

        if (liveData.items?.length > 0) {
          const videoId = liveData.items[0].id.videoId;
          console.log(`Found live video ID: ${videoId}`);

          // Get live stream details
          const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
          console.log('Fetching stream stats...');
          
          const statsResponse = await fetch(statsUrl);
          if (!statsResponse.ok) {
            console.error('YouTube API stats error:', await statsResponse.text());
            continue;
          }
          
          const statsData = await statsResponse.json();
          console.log('Stream stats response:', statsData);

          if (statsData.items?.length > 0) {
            isLive = true;
            viewersCount = parseInt(statsData.items[0].liveStreamingDetails?.concurrentViewers || '0');
            console.log(`Channel is live with ${viewersCount} viewers`);
          }
        } else {
          console.log('Channel is not live');
        }

        // Update metrics
        console.log(`Updating metrics for ${channel.channel_name}`);
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

        console.log(`Successfully updated metrics for ${channel.channel_name}`);

      } catch (error) {
        console.error(`Error processing channel ${channel.channel_name}:`, error);
      }
    }

    console.log('Finished processing all channels');
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