"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function addAssignedToQuoteReminders() {
    const client = await db_1.pool.connect();
    try {
        console.log('🔧 Adding assigned_to to quote_reminders in all tenant schemas...\n');
        const { rows: tenants } = await client.query(`SELECT name, schema_name FROM public.tenants ORDER BY id`);
        if (tenants.length === 0) {
            console.log('⚠️  No tenants found — nothing to migrate.');
            return;
        }
        for (const { name, schema_name } of tenants) {
            console.log(`  🏢 ${name} (${schema_name})`);
            const { rows } = await client.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = $1 AND table_name = 'quote_reminders'
      `, [schema_name]);
            if (rows.length === 0) {
                console.log(`     ⚠️  quote_reminders table missing — skipping`);
                continue;
            }
            await client.query(`
        ALTER TABLE "${schema_name}".quote_reminders
          ADD COLUMN IF NOT EXISTS assigned_to INT
      `);
            console.log(`     ✅ assigned_to column added (or already existed)`);
        }
        console.log('\n🎉 Migration complete!');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
    finally {
        client.release();
        await db_1.pool.end();
    }
}
if (require.main === module) {
    addAssignedToQuoteReminders()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
exports.default = addAssignedToQuoteReminders;
