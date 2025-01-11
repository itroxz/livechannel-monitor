import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
      throw new Error('Falha ao autenticar com a Twitch');
    }

    const data = await response.json();
    console.log('Successfully obtained Twitch access token');
    return data.access_token;
  } catch (error) {
    console.error('Error in getTwitchAccessToken:', error);
    throw new Error('Falha ao autenticar com a Twitch');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();
    console.log('Received request for Twitch username:', username);
    
    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Nome de usuário é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const TWITCH_CLIENT_ID = Deno.env.get('TWITCH_CLIENT_ID');
    const TWITCH_CLIENT_SECRET = Deno.env.get('TWITCH_CLIENT_SECRET');

    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
      console.error('Twitch credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Credenciais da Twitch não configuradas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const accessToken = await getTwitchAccessToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);

    console.log('Fetching Twitch user info for:', username);
    const response = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twitch API error:', errorText);
      throw new Error('Falha ao buscar informações do canal');
    }

    const data = await response.json();
    console.log('Twitch API response:', JSON.stringify(data));
    
    if (!data.data || data.data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Canal não encontrado. Verifique se o nome do usuário está correto.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    return new Response(
      JSON.stringify(data.data[0]),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-twitch-channel function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao buscar informações do canal' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});