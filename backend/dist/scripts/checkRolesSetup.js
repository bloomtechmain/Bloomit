"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function main() {
    const tables = await db_1.pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('roles', 'user_roles', 'permissions', 'role_permissions')
    ORDER BY table_name
  `);
    console.log('Existing RBAC tables:', tables.rows.map((r) => r.table_name));
    const roles = await db_1.pool.query(`SELECT id, name FROM public.roles ORDER BY name`);
    console.log('Roles:', roles.rows);
    const users = await db_1.pool.query(`SELECT id, name, email, tenant_id FROM public.users WHERE id IN (19, 20)`);
    console.log('Target users:', users.rows);
}
main().catch(console.error).finally(() => db_1.pool.end());
