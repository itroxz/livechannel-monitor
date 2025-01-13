import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getTwitchAccessToken(clientId: string, clientSecret: string) {
  try {
    console.log('Requesting Twitch access token...');
    const response = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get Twitch access token:', errorText);
      throw new Error('Failed to authenticate with Twitch');
    }

    const data = await response.json();
    console.log('Successfully obtained Twitch access token');
    return data.access_token;
  } catch (error) {
    console.error('Error in getTwitchAccessToken:', error);
    throw error;
  }
}

async function getChannelMetrics(channelId: string, clientId: string, accessToken: string) {
  try {
    console.log(`Fetching metrics for channel ID: ${channelId}`);
    const response = await fetch(`https://api.twitch.tv/helix/streams?user_id=${channelId}`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twitch API error:', errorText);
      throw new Error('Failed to fetch channel metrics');
    }

    const data = await response.json();
    console.log(`Stream data for channel ${channelId}:`, data);
    
    return {
      is_live: data.data.length > 0,
      viewers_count: data.data[0]?.viewer_count || 0,
    };
  } catch (error) {
    console.error(`Error fetching metrics for channel ${channelId}:`, error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWITCH_CLIENT_ID = Deno.env.get('TWITCH_CLIENT_ID');
    const TWITCH_CLIENT_SECRET = Deno.env.get('TWITCH_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all Twitch channels from the database
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('*')
      .eq('platform', 'twitch');

    if (channelsError) {
      throw channelsError;
    }

    console.log('Fetching metrics for Twitch channels:', channels);

    // Get Twitch access token
    const accessToken = await getTwitchAccessToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);

    // Fetch metrics for each channel
    for (const channel of channels) {
      try {
        const metrics = await getChannelMetrics(channel.channel_id, TWITCH_CLIENT_ID, accessToken);
        
        // Insert metrics into the database
        const { error: insertError } = await supabase
          .from('metrics')
          .insert({
            channel_id: channel.id,
            viewers_count: metrics.viewers_count,
            is_live: metrics.is_live,
          });

        if (insertError) {
          console.error(`Error inserting metrics for channel ${channel.channel_name}:`, insertError);
        } else {
          console.log(`Successfully updated metrics for channel ${channel.channel_name}`);
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
    console.error('Error in fetch-twitch-metrics function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});