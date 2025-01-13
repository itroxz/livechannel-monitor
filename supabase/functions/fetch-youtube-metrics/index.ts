import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchYouTubeMetrics(channel: any, YOUTUBE_API_KEY: string) {
  console.log(`[${new Date().toISOString()}] Starting metrics fetch for channel: ${channel.channel_name}`);
  
  try {
    let channelId = channel.channel_name;
    if (channel.channel_name.startsWith('@')) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channel.channel_name)}&key=${YOUTUBE_API_KEY}`;
      console.log('Searching for channel:', channel.channel_name);
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      const errorData = await searchResponse.json();
      
      if (!searchResponse.ok) {
        // Check specifically for API not enabled error
        if (errorData.error?.status === "PERMISSION_DENIED" && 
            errorData.error?.message?.includes("API") && 
            errorData.error?.message?.includes("disabled")) {
          console.error('YouTube API is not enabled:', errorData.error);
          throw new Error("YouTube API is not enabled. Please enable it in the Google Cloud Console at: " + 
            errorData.error?.details?.[0]?.metadata?.activationUrl || 
            "https://console.developers.google.com/apis/api/youtube.googleapis.com/overview");
        }
        
        throw new Error(`Failed to search channel: ${JSON.stringify(errorData)}`);
      }
      
      if (!errorData.items?.length) {
        console.log(`No channel found for ${channel.channel_name}`);
        return { isLive: false, viewersCount: 0 };
      }
      
      channelId = errorData.items[0].id.channelId;
    }

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
      const errorData = await liveResponse.json();
      console.error('Live stream check error:', errorData);
      throw new Error(`Failed to check live status: ${JSON.stringify(errorData)}`);
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
      const errorData = await statsResponse.json();
      console.error('Stream statistics error:', errorData);
      throw new Error(`Failed to fetch stream statistics: ${JSON.stringify(errorData)}`);
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
    console.error(`Error processing channel ${channel.channel_name}:`, error);
    
    // Check if the error is about API being disabled
    if (error instanceof Error && 
        error.message.includes("YouTube API is not enabled")) {
      // Rethrow the user-friendly error message
      throw error;
    }
    
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
    if (!YOUTUBE_API_KEY) {
      throw new Error('Missing YOUTUBE_API_KEY environment variable');
    }

    console.log('Fetching YouTube channels from database...');
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
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
        
        // Update metrics in database
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
            console.error(`Error inserting metrics for ${channel.channel_name}:`, metricsError);
            throw metricsError;
          }
        }
        
        return { channel: channel.channel_name, success: true, metrics };
      } catch (error) {
        console.error(`Error processing channel ${channel.channel_name}:`, error);
        return { 
          channel: channel.channel_name, 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }));

    console.log('Channel processing results:', results);
    return new Response(
      JSON.stringify({ 
        message: 'Metrics updated successfully', 
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-youtube-metrics function:', error);
    
    // Create a more user-friendly error response
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isApiDisabled = errorMessage.includes("YouTube API is not enabled");
    
    return new Response(
      JSON.stringify({ 
        error: isApiDisabled ? {
          message: "YouTube API is not enabled",
          details: "Please enable the YouTube Data API v3 in the Google Cloud Console and wait a few minutes for the changes to propagate.",
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
