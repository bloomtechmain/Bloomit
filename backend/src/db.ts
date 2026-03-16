import 'dotenv/config'
import { Pool, PoolClient } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const query = async (text: string, params?: unknown[], client?: PoolClient) => {
  if (client) {
    return client.query(text, params);
  }
  const newClient = await pool.connect();
  try {
    return await newClient.query(text, params);
  } finally {
    newClient.release();
  }
};
