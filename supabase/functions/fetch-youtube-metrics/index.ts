import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchYouTubeChannelData(channelNames: string[], apiKey: string) {
  try {
    console.log('Fetching YouTube data for channels:', channelNames);
    
    // Primeiro, buscar os IDs dos canais
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forUsername=${channelNames.join(',')}&key=${apiKey}`
    );

    if (!channelResponse.ok) {
      const errorText = await channelResponse.text();
      console.error('YouTube API error (channels):', errorText);
      throw new Error('Failed to fetch YouTube channel data');
    }

    const channelData = await channelResponse.json();
    console.log('YouTube API channel response:', channelData);

    // Para cada canal, verificar se há uma transmissão ao vivo
    const liveStreams = [];
    for (const channel of channelData.items || []) {
      const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
      if (uploadsPlaylistId) {
        // Buscar os últimos vídeos do canal
        const playlistResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=1&key=${apiKey}`
        );
        
        if (!playlistResponse.ok) continue;
        
        const playlistData = await playlistResponse.json();
        const latestVideoId = playlistData.items?.[0]?.contentDetails?.videoId;
        
        if (latestVideoId) {
          // Verificar se o último vídeo é uma live
          const videoResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${latestVideoId}&key=${apiKey}`
          );
          
          if (!videoResponse.ok) continue;
          
          const videoData = await videoResponse.json();
          if (videoData.items?.[0]?.liveStreamingDetails?.concurrentViewers) {
            liveStreams.push({
              channelId: channel.id,
              videoId: latestVideoId,
              viewers: parseInt(videoData.items[0].liveStreamingDetails.concurrentViewers)
            });
          }
        }
      }
    }

    return liveStreams;
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
        
        // Process each live stream
        for (const stream of youtubeData) {
          const channel = channels.find(c => c.channel_id === stream.channelId);
          if (!channel) continue;

          // Insert metrics into the database
          const { error: insertError } = await supabase
            .from('metrics')
            .insert({
              channel_id: channel.id,
              viewers_count: stream.viewers,
              is_live: true,
            });

          if (insertError) {
            console.error(`Error inserting metrics for channel ${channel.channel_name}:`, insertError);
          } else {
            console.log(`Successfully updated metrics for channel ${channel.channel_name}`);
          }
        }

        // Update offline status for channels not in youtubeData
        for (const channel of batchChannels) {
          if (!youtubeData.find(stream => stream.channelId === channel.channel_id)) {
            const { error: insertError } = await supabase
              .from('metrics')
              .insert({
                channel_id: channel.id,
                viewers_count: 0,
                is_live: false,
              });

            if (insertError) {
              console.error(`Error inserting offline metrics for channel ${channel.channel_name}:`, insertError);
            }
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