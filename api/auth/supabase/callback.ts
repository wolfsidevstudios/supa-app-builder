import { CONFIG } from './config';
import { Buffer } from 'buffer';

export default async function handler(req: any, res: any) {
  const { code } = req.query;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['host'];
  const redirectUri = `${protocol}://${host}/api/auth/supabase/callback`;

  if (!code) return res.status(400).send('No code provided');

  try {
    const response = await fetch(CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CONFIG.clientId}:${CONFIG.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri
      })
    });

    const data = await response.json();

    if (data.error) throw new Error(data.error_description || data.error);

    // Redirect back to the dashboard, passing the token in the URL fragment so it's accessible to the client app
    // In a full production app, you might set a secure cookie here.
    res.redirect(`/?supabase_access_token=${data.access_token}&refresh_token=${data.refresh_token}`);
  } catch (error: any) {
    console.error('Supabase Auth Error:', error);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
}