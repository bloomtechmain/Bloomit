
import { createTenant } from '../services/tenant-service';
import { pool, query } from '../db';
import bcrypt from 'bcryptjs';

const createTenantsExample = async () => {
  console.log('Creating tenants and users for demonstration...');

  // Create Tenant A
  const tenantA = await createTenant('Tenant A');
  console.log(`Tenant A created with schema: ${tenantA.schemaName}`);

  // Create a user for Tenant A
  const passwordA = 'passwordA';
  const hashA = await bcrypt.hash(passwordA, 10);
  const userA = await query(
    'INSERT INTO public.users (name, email, password_hash, tenant_id) VALUES ($1, $2, $3, $4) RETURNING id',
    ['User A', 'usera@example.com', hashA, tenantA.tenantId]
  );
  console.log(`User A created with ID: ${userA.rows[0].id}`);

  // Insert data for Tenant A
  await query(`INSERT INTO "${tenantA.schemaName}".projects (projects_name) VALUES ($1)`, ['Project A for Tenant A']);
  console.log('Inserted project for Tenant A');

  // Create Tenant B
  const tenantB = await createTenant('Tenant B');
  console.log(`Tenant B created with schema: ${tenantB.schemaName}`);

  // Create a user for Tenant B
  const passwordB = 'passwordB';
  const hashB = await bcrypt.hash(passwordB, 10);
  const userB = await query(
    'INSERT INTO public.users (name, email, password_hash, tenant_id) VALUES ($1, $2, $3, $4) RETURNING id',
    ['User B', 'userb@example.com', hashB, tenantB.tenantId]
  );
  console.log(`User B created with ID: ${userB.rows[0].id}`);

  // Insert data for Tenant B
  await query(`INSERT INTO "${tenantB.schemaName}".projects (projects_name) VALUES ($1)`, ['Project B for Tenant B']);
  console.log('Inserted project for Tenant B');

  // --- Demonstration of data isolation ---

  console.log('\n--- Demonstrating Data Isolation ---');

  // Query as User A
  const clientA = await pool.connect();
  try {
    await clientA.query(`SET search_path TO "${tenantA.schemaName}", public`);
    const projectsA = await clientA.query('SELECT * FROM projects');
    console.log('\nProjects for Tenant A:');
    console.log(projectsA.rows);
  } finally {
    clientA.release();
  }

  // Query as User B
  const clientB = await pool.connect();
  try {
    await clientB.query(`SET search_path TO "${tenantB.schemaName}", public`);
    const projectsB = await clientB.query('SELECT * FROM projects');
    console.log('\nProjects for Tenant B:');
    console.log(projectsB.rows);
  } finally {
    clientB.release();
  }

  console.log('\nDemonstration complete.');
};

createTenantsExample();
