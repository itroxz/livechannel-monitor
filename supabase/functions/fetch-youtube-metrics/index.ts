import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchYouTubeChannelData(channelNames: string[], apiKey: string) {
  try {
    console.log('Starting YouTube data fetch for channels:', channelNames);
    const results = [];
    
    for (const channelName of channelNames) {
      try {
        // Clean channel name and log
        const cleanChannelName = channelName.replace('@', '').trim();
        console.log(`Processing channel ${cleanChannelName}`);
        
        // First, get channel ID using search
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&q=${cleanChannelName}&type=channel&key=${apiKey}`;
        console.log('Fetching channel ID with URL:', searchUrl);
        
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
          console.error(`Error searching for channel ${cleanChannelName}:`, await searchResponse.text());
          continue;
        }

        const searchData = await searchResponse.json();
        console.log('Search response for channel:', searchData);
        
        if (!searchData.items?.length) {
          console.error(`No channel found for ${cleanChannelName}`);
          continue;
        }

        const channelId = searchData.items[0].id.channelId;
        console.log(`Found channel ID for ${cleanChannelName}:`, channelId);

        // Get channel's live broadcasts
        const liveUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`;
        console.log('Fetching live streams with URL:', liveUrl);
        
        const videosResponse = await fetch(liveUrl);
        if (!videosResponse.ok) {
          console.error(`Error fetching videos for ${cleanChannelName}:`, await videosResponse.text());
          continue;
        }

        const videosData = await videosResponse.json();
        console.log(`Live stream data for ${cleanChannelName}:`, videosData);

        const liveVideoId = videosData.items?.[0]?.id?.videoId;
        
        if (liveVideoId) {
          console.log(`Found live video ID for ${cleanChannelName}:`, liveVideoId);
          
          // Get live stream statistics
          const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,statistics&id=${liveVideoId}&key=${apiKey}`;
          console.log('Fetching video stats with URL:', statsUrl);
          
          const videoStatsResponse = await fetch(statsUrl);
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
          console.log(`Channel ${cleanChannelName} is not live`);
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
    console.error('Error in fetchYouTubeChannelData:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting YouTube metrics fetch function');
    
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

    // Process channels in batches
    const batchSize = 5; // Reduced batch size to avoid rate limits
    for (let i = 0; i < channels.length; i += batchSize) {
      const batchChannels = channels.slice(i, i + batchSize);
      const channelNames = batchChannels.map(channel => channel.channel_name);
      
      console.log(`Processing batch ${i/batchSize + 1} of channels:`, channelNames);

      const youtubeData = await fetchYouTubeChannelData(channelNames, YOUTUBE_API_KEY);
      console.log('YouTube data fetched:', youtubeData);
      
      for (const data of youtubeData) {
        const channel = channels.find(c => 
          c.channel_name.replace('@', '').trim() === data.channelName.replace('@', '').trim()
        );
        
        if (!channel) {
          console.error(`Channel not found in database: ${data.channelName}`);
          continue;
        }

        console.log(`Updating metrics for channel ${data.channelName}:`, {
          channelId: channel.id,
          viewers: data.viewers,
          isLive: data.isLive
        });

        // Update channel peak viewers if current viewers is higher
        if (data.viewers > channel.peak_viewers_count) {
          const { error: updateError } = await supabase
            .from('channels')
            .update({ peak_viewers_count: data.viewers })
            .eq('id', channel.id);

          if (updateError) {
            console.error(`Error updating peak viewers for channel ${data.channelName}:`, updateError);
          } else {
            console.log(`Updated peak viewers for channel ${data.channelName} to ${data.viewers}`);
          }
        }

        // Insert new metrics
        const { error: insertError } = await supabase
          .from('metrics')
          .insert({
            channel_id: channel.id,
            viewers_count: data.viewers,
            is_live: data.isLive,
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