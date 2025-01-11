import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getTwitchAccessToken(clientId: string, clientSecret: string) {
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    {
      method: 'POST',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get Twitch access token');
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username } = await req.json()
    
    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const TWITCH_CLIENT_ID = Deno.env.get('TWITCH_CLIENT_ID')
    const TWITCH_CLIENT_SECRET = Deno.env.get('TWITCH_CLIENT_SECRET')

    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
      console.error('Twitch credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Twitch credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Get Twitch access token
    const accessToken = await getTwitchAccessToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);

    // Use the access token to fetch user info
    const response = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error('Twitch API error:', await response.text());
      throw new Error('Failed to fetch Twitch channel info');
    }

    const data = await response.json()
    console.log('Twitch API response:', data);
    
    if (!data.data || data.data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Canal não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    return new Response(
      JSON.stringify(data.data[0]),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in get-twitch-channel function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})