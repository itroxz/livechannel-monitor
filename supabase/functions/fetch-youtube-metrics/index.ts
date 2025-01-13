import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchYouTubeChannelData(channelNames: string[], apiKey: string) {
  try {
    console.log('Fetching YouTube data for channels:', channelNames);
    const results = [];
    
    for (const channelName of channelNames) {
      try {
        // Clean channel name
        const cleanChannelName = channelName.replace('@', '').trim();
        console.log(`Processing channel: ${cleanChannelName}`);
        
        // First, get channel ID using search
        const searchResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=id&q=${cleanChannelName}&type=channel&key=${apiKey}`
        );

        if (!searchResponse.ok) {
          console.error(`Error searching for channel ${cleanChannelName}:`, await searchResponse.text());
          continue;
        }

        const searchData = await searchResponse.json();
        const channelId = searchData.items?.[0]?.id?.channelId;
        
        if (!channelId) {
          console.error(`Channel ID not found for ${cleanChannelName}`);
          continue;
        }

        console.log(`Found channel ID for ${cleanChannelName}:`, channelId);

        // Get channel's live broadcasts
        const videosResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`
        );

        if (!videosResponse.ok) {
          console.error(`Error fetching videos for ${cleanChannelName}:`, await videosResponse.text());
          continue;
        }

        const videosData = await videosResponse.json();
        console.log(`Live stream search results for ${cleanChannelName}:`, videosData);

        const liveVideoId = videosData.items?.[0]?.id?.videoId;
        const isLive = !!liveVideoId;

        if (isLive) {
          // Get live stream statistics
          const videoStatsResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,statistics&id=${liveVideoId}&key=${apiKey}`
          );

          if (!videoStatsResponse.ok) {
            console.error(`Error fetching video stats for ${cleanChannelName}:`, await videoStatsResponse.text());
            continue;
          }

          const videoStats = await videoStatsResponse.json();
          console.log(`Live stream stats for ${cleanChannelName}:`, videoStats);

          const viewerCount = parseInt(
            videoStats.items?.[0]?.liveStreamingDetails?.concurrentViewers || 
            videoStats.items?.[0]?.statistics?.viewCount ||
            '0'
          );

          results.push({
            channelName,
            channelId,
            isLive: true,
            viewers: viewerCount
          });
          
          console.log(`Successfully processed live channel ${cleanChannelName}:`, {
            isLive: true,
            viewers: viewerCount
          });
        } else {
          results.push({
            channelName,
            channelId,
            isLive: false,
            viewers: 0
          });
          console.log(`Channel ${cleanChannelName} is not live`);
        }
      } catch (error) {
        console.error(`Error processing channel ${channelName}:`, error);
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching YouTube data:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!YOUTUBE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get YouTube channels
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('*')
      .eq('platform', 'youtube');

    if (channelsError) {
      throw channelsError;
    }

    console.log('Found YouTube channels:', channels);

    // Process channels in batches
    const batchSize = 50;
    for (let i = 0; i < channels.length; i += batchSize) {
      const batchChannels = channels.slice(i, i + batchSize);
      const channelNames = batchChannels.map(channel => channel.channel_name);

      const youtubeData = await fetchYouTubeChannelData(channelNames, YOUTUBE_API_KEY);
      
      for (const data of youtubeData) {
        const channel = channels.find(c => 
          c.channel_name.replace('@', '').trim() === data.channelName.replace('@', '').trim()
        );
        
        if (!channel) {
          console.error(`Channel not found in database: ${data.channelName}`);
          continue;
        }

        // Get current peak viewers
        const { data: currentMetrics, error: metricsError } = await supabase
          .from('metrics')
          .select('peak_viewers_count')
          .eq('channel_id', channel.id)
          .order('timestamp', { ascending: false })
          .limit(1);

        if (metricsError) {
          console.error(`Error fetching metrics for channel ${data.channelName}:`, metricsError);
          continue;
        }

        const currentPeak = currentMetrics?.[0]?.peak_viewers_count || 0;
        const newPeak = Math.max(currentPeak, data.viewers);

        console.log(`Updating metrics for channel ${data.channelName}:`, {
          channelId: channel.id,
          currentPeak,
          newViewers: data.viewers,
          newPeak,
          isLive: data.isLive
        });

        const { error: insertError } = await supabase
          .from('metrics')
          .insert({
            channel_id: channel.id,
            viewers_count: data.viewers,
            is_live: data.isLive,
            peak_viewers_count: newPeak,
            timestamp: new Date().toISOString()
          });

        if (insertError) {
          console.error(`Error inserting metrics for channel ${data.channelName}:`, insertError);
        } else {
          console.log(`Successfully updated metrics for channel ${data.channelName}`);
        }
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