import { CONFIG } from './config';

export const runtime = 'edge';

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectUri = `${url.protocol}//${url.host}/api/auth/supabase/callback`;

  if (!code) return new Response('No code provided', { status: 400 });

  try {
    const authString = `${CONFIG.clientId}:${CONFIG.clientSecret}`;
    const encodedAuth = btoa(authString);

    const response = await fetch(CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${encodedAuth}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    const data = await response.json();

    if (data.error) throw new Error(data.error_description || data.error);

    // Redirect to root with tokens
    const targetUrl = new URL('/', url.origin);
    targetUrl.searchParams.set('supabase_access_token', data.access_token);
    targetUrl.searchParams.set('refresh_token', data.refresh_token);
    
    return Response.redirect(targetUrl.toString());
  } catch (error: any) {
    console.error('Supabase Auth Error:', error);
    return new Response(`Authentication failed: ${error.message}`, { status: 500 });
  }
}