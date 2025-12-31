
import { CONFIG } from './config';

export const runtime = 'edge';

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const redirectUri = `${url.protocol}//${url.host}/api/auth/netlify/callback`;

  if (!CONFIG.clientId) {
      return new Response("NETLIFY_CLIENT_ID is not configured", { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state: Math.random().toString(36).substring(7)
  });

  return Response.redirect(`${CONFIG.authUrl}?${params.toString()}`);
}
