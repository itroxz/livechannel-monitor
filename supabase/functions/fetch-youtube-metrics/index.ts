import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchYouTubeData(videoIds: string[], apiKey: string) {
  try {
    console.log('Fetching YouTube data for videos:', videoIds);
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoIds.join(',')}&key=${apiKey}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API error:', errorText);
      throw new Error('Failed to fetch YouTube data');
    }

    const data = await response.json();
    console.log('YouTube API response:', data);
    return data;
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
      const videoIds = batchChannels.map(channel => channel.channel_id);

      try {
        const youtubeData = await fetchYouTubeData(videoIds, YOUTUBE_API_KEY);
        
        // Process each video in the response
        for (const video of youtubeData.items) {
          const channel = channels.find(c => c.channel_id === video.id);
          if (!channel) continue;

          const viewersCount = parseInt(video.liveStreamingDetails?.concurrentViewers || '0');
          const isLive = !!video.liveStreamingDetails?.concurrentViewers;

          // Insert metrics into the database
          const { error: insertError } = await supabase
            .from('metrics')
            .insert({
              channel_id: channel.id,
              viewers_count: viewersCount,
              is_live: isLive,
            });

          if (insertError) {
            console.error(`Error inserting metrics for channel ${channel.channel_name}:`, insertError);
          } else {
            console.log(`Successfully updated metrics for channel ${channel.channel_name}`);
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