import { pool } from '../db'

async function addTimerColumnsToTimeEntries() {
  const client = await pool.connect()

  try {
    console.log('🔧 Adding missing timer columns to tenant time_entries tables...\n')

    // Drop the public.time_entries table that was incorrectly created by a previous run
    const publicTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'time_entries'
      )
    `)
    if (publicTableExists.rows[0].exists) {
      await client.query(`DROP TABLE public.time_entries CASCADE`)
      console.log('🗑️  Dropped incorrectly created public.time_entries\n')
    }

    // Get all tenant schemas
    const tenantsResult = await client.query(`SELECT name, schema_name FROM public.tenants ORDER BY id`)
    const tenants = tenantsResult.rows

    if (tenants.length === 0) {
      console.log('⚠️  No tenants found in public.tenants — nothing to migrate.')
      return
    }

    console.log(`📋 Found ${tenants.length} tenant(s):\n`)

    for (const tenant of tenants) {
      const { name, schema_name } = tenant
      console.log(`  🏢 ${name} (${schema_name})`)

      // Check if time_entries exists in this tenant schema
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = $1 AND table_name = 'time_entries'
        )
      `, [schema_name])

      if (!tableExists.rows[0].exists) {
        console.log(`     ⚠️  time_entries table missing — creating it...`)
        await client.query(`
          SET search_path TO "${schema_name}", public;
          CREATE TABLE IF NOT EXISTS time_entries (
            id SERIAL PRIMARY KEY,
            employee_id INT NOT NULL,
            project_id INT NOT NULL,
            contract_id INT,
            date DATE NOT NULL,
            clock_in TIMESTAMP,
            clock_out TIMESTAMP,
            total_hours DECIMAL(10,2),
            break_time_minutes INT DEFAULT 0,
            description TEXT,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            approved_by INT,
            approved_at TIMESTAMP,
            rejection_note TEXT,
            is_timer_based BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          SET search_path TO DEFAULT;
        `)
        console.log(`     ✅ Created time_entries`)
      } else {
        // Add missing columns to existing table
        await client.query(`
          ALTER TABLE "${schema_name}".time_entries
            ADD COLUMN IF NOT EXISTS is_timer_based BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS rejection_note TEXT
        `)
        console.log(`     ✅ Columns added (or already existed)`)
      }

      // Ensure active_timers exists in tenant schema too
      const activeTimersExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = $1 AND table_name = 'active_timers'
        )
      `, [schema_name])

      if (!activeTimersExists.rows[0].exists) {
        await client.query(`
          CREATE TABLE "${schema_name}".active_timers (
            id SERIAL PRIMARY KEY,
            employee_id INT NOT NULL UNIQUE,
            time_entry_id INT NOT NULL,
            started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            is_on_break BOOLEAN DEFAULT false,
            total_break_time_minutes INT DEFAULT 0,
            last_break_start TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_active_timers_employee_${schema_name}
            ON "${schema_name}".active_timers(employee_id);
        `)
        console.log(`     ✅ Created active_timers`)
      } else {
        console.log(`     ✅ active_timers already exists`)
      }

      // Verify
      const cols = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = 'time_entries'
          AND column_name IN ('is_timer_based', 'approved_at', 'rejection_note')
        ORDER BY column_name
      `, [schema_name])
      console.log(`     📋 Verified: ${cols.rows.map((r: any) => r.column_name).join(', ')}\n`)
    }

    console.log('🎉 Migration complete!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

if (require.main === module) {
  addTimerColumnsToTimeEntries()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export default addTimerColumnsToTimeEntries
