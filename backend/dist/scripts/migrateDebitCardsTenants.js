"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function migrateDebitCardsTenants() {
    const client = await db_1.pool.connect();
    try {
        console.log('🔧 Ensuring debit_cards table in all tenant schemas...\n');
        const { rows: tenants } = await client.query(`SELECT name, schema_name FROM public.tenants ORDER BY id`);
        if (tenants.length === 0) {
            console.log('⚠️  No tenants found — nothing to migrate.');
            return;
        }
        for (const { name, schema_name } of tenants) {
            console.log(`  🏢 ${name} (${schema_name})`);
            await client.query(`
        CREATE TABLE IF NOT EXISTS "${schema_name}".debit_cards (
          id SERIAL PRIMARY KEY,
          bank_account_id INT NOT NULL REFERENCES "${schema_name}".company_bank_accounts(id) ON DELETE CASCADE,
          card_number_last4 VARCHAR(4) NOT NULL,
          card_holder_name VARCHAR(100) NOT NULL,
          expiry_date DATE NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
            console.log(`     ✅ debit_cards table ensured`);
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
    migrateDebitCardsTenants()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
exports.default = migrateDebitCardsTenants;
