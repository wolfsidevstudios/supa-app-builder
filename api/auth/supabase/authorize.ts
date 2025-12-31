
import { CONFIG } from './config';

export default function handler(req: any, res: any) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['host'];
  // Dynamic redirect URI based on current host (supports localhost and vercel deployments)
  const redirectUri = `${protocol}://${host}/api/auth/supabase/callback`;

  const params = new URLSearchParams({
    client_id: CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'all', // Required to read projects and get API keys
    state: Math.random().toString(36).substring(7) // Simple state for CSRF mitigation
  });

  res.redirect(`${CONFIG.authUrl}?${params.toString()}`);
}
