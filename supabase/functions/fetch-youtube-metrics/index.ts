import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchYouTubeMetrics(channel: any, YOUTUBE_API_KEY: string) {
  console.log(`[${new Date().toISOString()}] Starting metrics fetch for channel: ${channel.channel_name}`);
  
  try {
    // 1. Get channel ID directly from channel name/handle
    let channelId = channel.channel_name;
    if (channel.channel_name.startsWith('@')) {
      // If it's a handle, we need to search for the channel first
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channel.channel_name)}&key=${YOUTUBE_API_KEY}`;
      console.log('Searching for channel:', channel.channel_name);
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('Channel search error:', errorText);
        throw new Error(`Failed to search channel: ${errorText}`);
      }
      
      const searchData = await searchResponse.json();
      console.log('Channel search response:', searchData);
      
      if (!searchData.items?.length) {
        console.log(`No channel found for ${channel.channel_name}`);
        return { isLive: false, viewersCount: 0 };
      }
      
      channelId = searchData.items[0].id.channelId;
    }

    console.log(`Using channel ID for ${channel.channel_name}:`, channelId);
    
    // 2. Check if channel is streaming using search endpoint with eventType=live
    const liveUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`;
    console.log('Checking for live streams:', liveUrl);
    
    const liveResponse = await fetch(liveUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    if (!liveResponse.ok) {
      const errorText = await liveResponse.text();
      console.error('Live stream check error:', errorText);
      throw new Error(`Failed to check live status: ${errorText}`);
    }
    
    const liveData = await liveResponse.json();
    console.log('Live stream check response:', liveData);

    if (!liveData.items?.length) {
      console.log(`No live stream found for ${channel.channel_name}`);
      return { isLive: false, viewersCount: 0 };
    }

    // 3. Get live stream statistics using videos endpoint
    const videoId = liveData.items[0].id.videoId;
    console.log(`Found live video ID for ${channel.channel_name}:`, videoId);
    
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;
    console.log('Fetching stream statistics:', statsUrl);
    
    const statsResponse = await fetch(statsUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    if (!statsResponse.ok) {
      const errorText = await statsResponse.text();
      console.error('Stream statistics error:', errorText);
      throw new Error(`Failed to fetch stream statistics: ${errorText}`);
    }
    
    const statsData = await statsResponse.json();
    console.log('Stream statistics response:', statsData);

    if (!statsData.items?.length) {
      console.log(`No statistics found for ${channel.channel_name}`);
      return { isLive: false, viewersCount: 0 };
    }

    const viewersCount = parseInt(statsData.items[0].liveStreamingDetails?.concurrentViewers || '0');
    console.log(`Channel ${channel.channel_name} has ${viewersCount} viewers`);
    return { isLive: true, viewersCount };
  } catch (error) {
    console.error(`Error fetching metrics for channel ${channel.channel_name}:`, error);
    throw error;
  }
}

async function updateMetricsInDatabase(channel: any, metrics: any, supabase: any) {
  console.log(`Updating metrics for channel ${channel.channel_name}:`, metrics);
  
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
      console.error(`Error inserting metrics for ${channel.channel_name}:`, error);
      throw error;
    }
    
    console.log(`Metrics updated successfully for ${channel.channel_name}`);
  } catch (error) {
    console.error(`Database error for ${channel.channel_name}:`, error);
    throw error;
  }
}

serve(async (req) => {
  console.log('[YouTube Metrics] Starting function execution');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!YOUTUBE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables:', {
        hasYoutubeKey: !!YOUTUBE_API_KEY,
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
      });
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
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
      return new Response(
        JSON.stringify({ message: 'No YouTube channels to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing channels...');
    const results = await Promise.all(channels.map(async (channel) => {
      try {
        console.log(`Processing channel: ${channel.channel_name}`);
        const metrics = await fetchYouTubeMetrics(channel, YOUTUBE_API_KEY);
        await updateMetricsInDatabase(channel, metrics, supabase);
        return { channel: channel.channel_name, success: true };
      } catch (error) {
        console.error(`Error processing channel ${channel.channel_name}:`, error);
        return { channel: channel.channel_name, success: false, error: error.message };
      }
    }));

    console.log('Channel processing results:', results);
    return new Response(
      JSON.stringify({ message: 'Metrics updated successfully', results }),
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