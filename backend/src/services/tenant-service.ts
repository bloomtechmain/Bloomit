
import { pool, query } from '../db';
import fs from 'fs';
import path from 'path';

const createTenantSchema = async (schemaName: string) => {
  await query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
};

const createTenantTables = async (schemaName: string) => {
  const databaseSql = fs.readFileSync(path.join(__dirname, '../databasse.sql'), 'utf-8');
  const statements = databaseSql.split(';').filter(s => s.trim().length > 0);

  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${schemaName}"`);
    for (const statement of statements) {
      // We need to remove foreign key constraints to public tables from this script
      const cleanedStatement = statement.replace(/CONSTRAINT fk_.* REFERENCES .*\(id\)/g, '');
      await client.query(cleanedStatement);
    }
  } finally {
    client.release();
  }
};

export const createTenant = async (tenantName: string) => {
  const schemaName = `tenant_${tenantName.toLowerCase().replace(/\s+/g, '_')}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'INSERT INTO public.tenants (name, schema_name) VALUES ($1, $2) RETURNING id',
      [tenantName, schemaName]
    );
    const tenantId = result.rows[0].id;

    await createTenantSchema(schemaName);
    await createTenantTables(schemaName);

    await client.query('COMMIT');

    return { tenantId, schemaName };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
