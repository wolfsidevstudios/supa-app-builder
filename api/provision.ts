import { Client } from 'pg';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // If we are running in a build environment without DB credentials, return mock
  if (!process.env.DATABASE_URL) {
    return res.status(200).json({ projectId: `mock_proj_${Math.random().toString(36).substr(2, 9)}`, warning: "No DATABASE_URL found" });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const projectId = `proj_${Math.random().toString(36).substr(2, 9)}`;

  try {
    await client.connect();
    // Create a schema for this project to isolate its data
    await client.query(`CREATE SCHEMA "${projectId}"`);
    // Ideally create a role and grant usage, but for simple proxy we just use schema isolation
    
    await client.end();
    return res.status(200).json({ projectId });
  } catch (error: any) {
    console.error('Provision Error:', error);
    return res.status(500).json({ error: error.message });
  }
}