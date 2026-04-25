import request from 'supertest'
import { Pool } from 'pg'
import app from '../index'

export const TEST_DB_URL = 'postgresql://postgres:postgres@localhost:5432/bloomtech_test'
export const TENANT_SCHEMA = 'tenant_test'

export const pool = new Pool({ connectionString: TEST_DB_URL })

export const ADMIN_CREDS = { email: 'admin@test.com', password: 'TestPass123!' }

export async function loginAs(creds = ADMIN_CREDS): Promise<string> {
  const res = await request(app)
    .post('/auth/login')
    .send({ ...creds, force: true })
  if (!res.body.accessToken) {
    throw new Error(`Login failed: ${JSON.stringify(res.body)}`)
  }
  return res.body.accessToken
}

export async function loginAsDetails(creds = ADMIN_CREDS): Promise<{ token: string; userId: number }> {
  const res = await request(app)
    .post('/auth/login')
    .send({ ...creds, force: true })
  if (!res.body.accessToken) {
    throw new Error(`Login failed: ${JSON.stringify(res.body)}`)
  }
  return { token: res.body.accessToken, userId: res.body.user.id }
}

export async function cleanTable(table: string) {
  const client = await pool.connect()
  try {
    await client.query(`SET search_path TO "${TENANT_SCHEMA}", public`)
    await client.query(`DELETE FROM ${table}`)
  } finally {
    client.release()
  }
}

export async function cleanPublicTable(table: string) {
  await pool.query(`DELETE FROM public.${table} WHERE id > 1`)
}
