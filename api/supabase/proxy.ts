
export default async function handler(req: any, res: any) {
  // Allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();
  
  // Extract the Management API Token sent from the frontend
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
  const { endpoint } = req.query; // Expects a path like /v1/projects

  if (!token) return res.status(401).json({error: "Missing authorization token"});
  if (!endpoint) return res.status(400).json({error: "Missing endpoint parameter"});

  try {
      const fetchOptions: RequestInit = {
          method: req.method,
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          }
      };

      if (req.method === 'POST') {
          // Forward the body. Vercel/Next.js parses JSON body automatically.
          if (req.body) {
             // If req.body is an object, stringify it. If string, use as is.
             fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
          }
      }

      const response = await fetch(`https://api.supabase.com${endpoint}`, fetchOptions);
      
      // Handle response content safely (might not be JSON)
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
          data = await response.json();
      } else {
          // Fallback for text or empty responses
          const text = await response.text();
          try {
             data = text ? JSON.parse(text) : {};
          } catch {
             data = { message: text };
          }
      }
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      
      res.status(200).json(data);
  } catch(e: any) {
      console.error("Proxy Error", e);
      res.status(500).json({error: e.message});
  }
}
