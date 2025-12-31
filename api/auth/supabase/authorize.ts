import { CONFIG } from './config';

export const runtime = 'edge';

export default async function handler(request: Request) {
  const url = new URL(request.url);
  // Construct redirect URI using the request URL to ensure correct host (localhost vs production)
  const redirectUri = `${url.protocol}//${url.host}/api/auth/supabase/callback`;

  const params = new URLSearchParams({
    client_id: CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'all',
    state: Math.random().toString(36).substring(7)
  });

  return Response.redirect(`${CONFIG.authUrl}?${params.toString()}`);
}