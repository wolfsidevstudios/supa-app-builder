
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).end();
  
  // Extract the Management API Token sent from the frontend
  const token = req.headers.authorization?.split(' ')[1];
  const { endpoint } = req.query; // Expects a path like /v1/projects

  if (!token) return res.status(401).json({error: "Missing authorization token"});
  if (!endpoint) return res.status(400).json({error: "Missing endpoint parameter"});

  try {
      const response = await fetch(`https://api.supabase.com${endpoint}`, {
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      
      res.status(200).json(data);
  } catch(e: any) {
      console.error("Proxy Error", e);
      res.status(500).json({error: e.message});
  }
}
