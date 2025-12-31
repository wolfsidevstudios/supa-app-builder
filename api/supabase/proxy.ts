export const runtime = 'edge';

export default async function handler(request: Request) {
  if (request.method !== 'GET' && request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
  
  const url = new URL(request.url);
  const endpoint = url.searchParams.get('endpoint');

  if (!token) return new Response(JSON.stringify({error: "Missing authorization token"}), { status: 401, headers: { 'Content-Type': 'application/json' }});
  if (!endpoint) return new Response(JSON.stringify({error: "Missing endpoint parameter"}), { status: 400, headers: { 'Content-Type': 'application/json' }});

  try {
      const fetchOptions: RequestInit = {
          method: request.method,
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          }
      };

      if (request.method === 'POST') {
          // Clone the request to read body
          const body = await request.text();
          if (body) {
             fetchOptions.body = body;
          }
      }

      const response = await fetch(`https://api.supabase.com${endpoint}`, fetchOptions);
      
      const data = await response.text();
      
      return new Response(data, {
          status: response.status,
          headers: {
              'Content-Type': response.headers.get('content-type') || 'application/json'
          }
      });
  } catch(e: any) {
      return new Response(JSON.stringify({error: e.message}), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
}