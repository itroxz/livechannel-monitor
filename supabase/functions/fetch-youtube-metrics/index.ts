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
        // Remove @ if present
        const cleanChannelName = channelName.startsWith('@') ? channelName.substring(1) : channelName;
        
        // First, search for the channel
        const searchResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${cleanChannelName}&type=channel&key=${apiKey}`
        );

        if (!searchResponse.ok) {
          console.error(`Error searching for channel ${channelName}:`, await searchResponse.text());
          continue;
        }

        const searchData = await searchResponse.json();
        const channelId = searchData.items?.[0]?.id?.channelId;
        
        if (!channelId) {
          console.error(`Channel ID not found for ${channelName}`);
          continue;
        }

        console.log(`Found channel ID for ${channelName}:`, channelId);

        // Now search for active live streams for this channel
        const liveStreamResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`
        );

        if (!liveStreamResponse.ok) {
          console.error(`Error fetching live stream for ${channelName}:`, await liveStreamResponse.text());
          continue;
        }

        const liveStreamData = await liveStreamResponse.json();
        const liveStream = liveStreamData.items?.[0];

        if (liveStream) {
          console.log(`Found live stream for ${channelName}:`, liveStream.id.videoId);
          
          // Get live stream details including viewer count
          const videoResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,statistics&id=${liveStream.id.videoId}&key=${apiKey}`
          );

          if (!videoResponse.ok) {
            console.error(`Error fetching video details for ${channelName}:`, await videoResponse.text());
            continue;
          }

          const videoData = await videoResponse.json();
          const videoDetails = videoData.items?.[0];
          const concurrentViewers = videoDetails?.liveStreamingDetails?.concurrentViewers || 
                                  videoDetails?.statistics?.viewCount || 0;

          console.log(`Channel ${channelName} live stream details:`, {
            concurrentViewers,
            videoDetails
          });

          if (concurrentViewers) {
            results.push({
              channelName,
              channelId,
              isLive: true,
              viewers: parseInt(concurrentViewers)
            });
            console.log(`Channel ${channelName} is live with ${concurrentViewers} viewers`);
          }
        } else {
          console.log(`Channel ${channelName} is not live`);
          results.push({
            channelName,
            channelId,
            isLive: false,
            viewers: 0
          });
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
  // Handle CORS preflight requests
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

    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all YouTube channels from the database
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('*')
      .eq('platform', 'youtube');

    if (channelsError) {
      throw channelsError;
    }

    console.log('Fetching metrics for YouTube channels:', channels);

    // Process channels in batches of 50 (YouTube API limit)
    const batchSize = 50;
    for (let i = 0; i < channels.length; i += batchSize) {
      const batchChannels = channels.slice(i, i + batchSize);
      const channelNames = batchChannels.map(channel => channel.channel_name);

      try {
        const youtubeData = await fetchYouTubeChannelData(channelNames, YOUTUBE_API_KEY);
        
        // Process each channel's data
        for (const data of youtubeData) {
          const channel = channels.find(c => c.channel_name === data.channelName);
          if (!channel) continue;

          // Get the current peak viewers for this channel
          const { data: currentMetrics, error: metricsError } = await supabase
            .from('metrics')
            .select('peak_viewers_count')
            .eq('channel_id', channel.id)
            .order('peak_viewers_count', { ascending: false })
            .limit(1);

          if (metricsError) {
            console.error(`Error fetching current metrics for channel ${data.channelName}:`, metricsError);
            continue;
          }

          const currentPeak = currentMetrics?.[0]?.peak_viewers_count || 0;
          const newPeak = Math.max(currentPeak, data.viewers);

          console.log(`Channel ${data.channelName} metrics:`, {
            currentPeak,
            newViewers: data.viewers,
            newPeak,
            isLive: data.isLive
          });

          // Insert metrics into the database
          const { error: insertError } = await supabase
            .from('metrics')
            .insert({
              channel_id: channel.id,
              viewers_count: data.viewers,
              is_live: data.isLive,
              peak_viewers_count: newPeak
            });

          if (insertError) {
            console.error(`Error inserting metrics for channel ${data.channelName}:`, insertError);
          } else {
            console.log(`Successfully updated metrics for channel ${data.channelName}`);
          }
        }
      } catch (error) {
        console.error(`Error processing batch of channels:`, error);
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