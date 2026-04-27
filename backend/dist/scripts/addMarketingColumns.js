"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
/**
 * Migration: Add marketing/subscription columns to public.users
 * These fields are populated by the external marketing website when users sign up.
 *
 * New columns:
 *   company_type    - Type of company (e.g. 'restaurant', 'retail')
 *   package_name    - Subscribed package name (e.g. 'Starter', 'Pro')
 *   package_price   - Price of the package
 *   package_status  - Status of the package (e.g. 'active', 'expired', 'cancelled')
 *   no_of_users     - Number of user seats included in the package
 *   purchase_date   - Date the package was purchased
 *   plan_type       - Billing cycle type (e.g. 'monthly', 'yearly')
 *   plan_features   - JSON array of feature keys included in the plan
 */
async function main() {
    const client = await db_1.pool.connect();
    try {
        console.log('🔧 Adding marketing/subscription columns to public.users...\n');
        await client.query('BEGIN');
        await client.query(`
      DO $$
      BEGIN

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'company_type'
        ) THEN
          ALTER TABLE public.users ADD COLUMN company_type VARCHAR(100);
          COMMENT ON COLUMN public.users.company_type IS 'Type of company registered on the marketing site';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'package_name'
        ) THEN
          ALTER TABLE public.users ADD COLUMN package_name VARCHAR(100);
          COMMENT ON COLUMN public.users.package_name IS 'Subscribed package name (e.g. Starter, Pro)';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'package_price'
        ) THEN
          ALTER TABLE public.users ADD COLUMN package_price NUMERIC(10,2);
          COMMENT ON COLUMN public.users.package_price IS 'Price paid for the package';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'package_status'
        ) THEN
          ALTER TABLE public.users ADD COLUMN package_status VARCHAR(50);
          COMMENT ON COLUMN public.users.package_status IS 'Status of the subscription (e.g. active, expired, cancelled)';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'no_of_users'
        ) THEN
          ALTER TABLE public.users ADD COLUMN no_of_users INTEGER;
          COMMENT ON COLUMN public.users.no_of_users IS 'Number of user seats included in the package';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'purchase_date'
        ) THEN
          ALTER TABLE public.users ADD COLUMN purchase_date DATE;
          COMMENT ON COLUMN public.users.purchase_date IS 'Date the package was purchased';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'plan_type'
        ) THEN
          ALTER TABLE public.users ADD COLUMN plan_type VARCHAR(50);
          COMMENT ON COLUMN public.users.plan_type IS 'Billing cycle type (e.g. monthly, yearly)';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'plan_features'
        ) THEN
          ALTER TABLE public.users ADD COLUMN plan_features JSONB;
          COMMENT ON COLUMN public.users.plan_features IS 'JSON array of feature keys included in the plan';
        END IF;

      END $$;
    `);
        await client.query('COMMIT');
        console.log('✅ Migration complete. New columns added to public.users:');
        console.log('   • company_type');
        console.log('   • package_name');
        console.log('   • package_price');
        console.log('   • package_status');
        console.log('   • no_of_users');
        console.log('   • purchase_date');
        console.log('   • plan_type');
        console.log('   • plan_features');
        // Verify
        const result = await db_1.pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
        AND column_name IN (
          'company_type','package_name','package_price','package_status',
          'no_of_users','purchase_date','plan_type','plan_features'
        )
      ORDER BY column_name;
    `);
        console.log('\n📋 Verified columns in DB:');
        result.rows.forEach(row => {
            console.log(`   • ${row.column_name} (${row.data_type})`);
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed, rolled back:', err);
        process.exitCode = 1;
    }
    finally {
        client.release();
        await db_1.pool.end();
    }
}
main();
