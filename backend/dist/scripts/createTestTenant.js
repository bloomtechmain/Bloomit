"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tenant_service_1 = require("../services/tenant-service");
const db_1 = require("../db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function main() {
    const tenantName = process.argv[2] || 'TestCompany';
    const userEmail = process.argv[3] || 'user@testcompany.com';
    const userPassword = process.argv[4] || 'Test@1234';
    console.log(`\n🏢 Creating tenant: ${tenantName}`);
    const { tenantId, schemaName } = await (0, tenant_service_1.createTenant)(tenantName);
    console.log(`✅ Tenant created — ID: ${tenantId}, Schema: ${schemaName}`);
    const passwordHash = await bcryptjs_1.default.hash(userPassword, 10);
    const result = await db_1.pool.query(`INSERT INTO public.users (name, email, password_hash, tenant_id, account_status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING id`, [tenantName + ' Admin', userEmail, passwordHash, tenantId]);
    const userId = result.rows[0].id;
    // Get or create Admin role
    let role = await db_1.pool.query(`SELECT id FROM roles WHERE name = 'Admin'`);
    let adminRoleId;
    if (!role.rows.length) {
        const r = await db_1.pool.query(`INSERT INTO roles (name, description, is_system_role) VALUES ($1,$2,TRUE) RETURNING id`, ['Admin', 'Company administrator with full access']);
        adminRoleId = r.rows[0].id;
    }
    else {
        adminRoleId = role.rows[0].id;
    }
    // Assign Admin role to user
    await db_1.pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [userId, adminRoleId]);
    // Grant all permissions to Admin role
    const perms = await db_1.pool.query('SELECT id FROM permissions');
    for (const p of perms.rows) {
        await db_1.pool.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [adminRoleId, p.id]);
    }
    console.log(`✅ User created — ID: ${userId}`);
    console.log(`\n📝 Tenant Login Credentials:`);
    console.log(`   Email:    ${userEmail}`);
    console.log(`   Password: ${userPassword}`);
    console.log(`   Tenant:   ${tenantName} (ID: ${tenantId})`);
    console.log(`   Schema:   ${schemaName}`);
    console.log(`\n✅ Done! Login with these credentials to test tenant isolation.\n`);
}
main()
    .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
    .finally(() => db_1.pool.end());
