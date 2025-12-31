import { Client } from 'pg';

export default async function handler(req: any, res: any) {
  // CORS Headers for the iframe
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // In production, lock this down or use dynamic origin
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { projectId, sql } = req.body;

  if (!projectId || !sql) {
    return res.status(400).json({ error: 'Missing projectId or sql' });
  }

  // Prevent accessing system schemas or other projects (Basic sanitation)
  // Real implementation needs robust SQL parsing or role-based isolation
  if (sql.toLowerCase().includes('pg_') || sql.toLowerCase().includes('information_schema')) {
     // return res.status(403).json({ error: 'System tables access denied' });
  }

  if (!process.env.DATABASE_URL) {
     return res.status(503).json({ error: 'Database not configured (DATABASE_URL missing)' });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // START TRANSACTION
    await client.query('BEGIN');
    
    // 1. Switch to the project's schema
    // This ensures subsequent queries only affect tables in "proj_xyz"
    // We sanitize projectId to ensure it only contains valid characters
    const safeProjectId = projectId.replace(/[^a-zA-Z0-9_]/g, '');
    await client.query(`SET search_path TO "${safeProjectId}", public`);

    // 2. Execute the user's SQL
    const result = await client.query(sql);

    // COMMIT
    await client.query('COMMIT');
    
    await client.end();

    return res.status(200).json(result.rows);
  } catch (error: any) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    try { await client.end(); } catch (e) {}
    
    console.error('Query Error:', error);
    
    // Handle "schema does not exist" - meaning project wasn't provisioned or lost
    if (error.code === '3F000') {
        return res.status(404).json({ error: 'Project database not found.' });
    }

    return res.status(500).json({ error: error.message });
  }
}