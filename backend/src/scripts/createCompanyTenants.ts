import { createTenant } from '../services/tenant-service';
import { query, pool } from '../db';
import bcrypt from 'bcryptjs';

const createCompanyTenants = async () => {
  console.log('Creating Company A and Company B tenants...\n');

  // --- Company A ---
  const tenantA = await createTenant('Company A');
  console.log(`✅ Company A created — schema: ${tenantA.schemaName}`);

  const hashA = await bcrypt.hash('companyA123', 10);
  const userA = await query(
    `INSERT INTO public.users (name, email, password_hash, tenant_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    ['Admin A', 'admin@companya.com', hashA, tenantA.tenantId]
  );
  console.log(`✅ Admin user created for Company A — email: admin@companya.com, password: companyA123, user id: ${userA.rows[0].id}`);

  // --- Company B ---
  const tenantB = await createTenant('Company B');
  console.log(`\n✅ Company B created — schema: ${tenantB.schemaName}`);

  const hashB = await bcrypt.hash('companyB123', 10);
  const userB = await query(
    `INSERT INTO public.users (name, email, password_hash, tenant_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    ['Admin B', 'admin@companyb.com', hashB, tenantB.tenantId]
  );
  console.log(`✅ Admin user created for Company B — email: admin@companyb.com, password: companyB123, user id: ${userB.rows[0].id}`);

  console.log('\n--- Summary ---');
  console.log(`Company A  schema: ${tenantA.schemaName}  |  tenant_id: ${tenantA.tenantId}`);
  console.log(`Company B  schema: ${tenantB.schemaName}  |  tenant_id: ${tenantB.tenantId}`);
};

createCompanyTenants()
  .then(() => {
    console.log('\n🎉 Done!');
    pool.end();
  })
  .catch((err) => {
    console.error('❌ Error:', err.message);
    pool.end();
    process.exit(1);
  });
