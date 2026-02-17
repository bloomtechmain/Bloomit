"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
/**
 * FINAL COMPREHENSIVE EMPLOYEE ONBOARDING FIX
 *
 * This script:
 * 1. Adds all missing columns to employees table
 * 2. Migrates existing data from old columns to new columns
 * 3. Fixes the employees ID sequence
 * 4. Adds account_status to users table
 * 5. Handles all edge cases
 */
async function fixEmployeeOnboarding() {
    const client = await db_1.pool.connect();
    try {
        console.log('🔧 Starting Final Employee Onboarding Fix...\n');
        await client.query('BEGIN');
        // ==========================================
        // STEP 1: Add missing columns to EMPLOYEES table
        // ==========================================
        console.log('📋 Step 1: Adding missing columns to employees table...');
        const employeeColumns = [
            { name: 'first_name', type: 'VARCHAR(100)' },
            { name: 'last_name', type: 'VARCHAR(100)' },
            { name: 'employee_number', type: 'VARCHAR(50)' },
            { name: 'user_id', type: 'INTEGER' },
            { name: 'employee_department', type: 'VARCHAR(100)' },
            { name: 'base_salary', type: 'DECIMAL(12,2)' },
            { name: 'designation', type: 'VARCHAR(100)' },
            { name: 'dob', type: 'DATE' },
            { name: 'nic', type: 'VARCHAR(50)' },
            { name: 'address', type: 'TEXT' },
            { name: 'epf_enabled', type: 'BOOLEAN DEFAULT false' },
            { name: 'epf_contribution_rate', type: 'DECIMAL(5,2) DEFAULT 8.00' },
            { name: 'etf_enabled', type: 'BOOLEAN DEFAULT false' },
            { name: 'allowances', type: 'JSONB DEFAULT \'{}\'::jsonb' },
            { name: 'pto_allowance', type: 'INTEGER DEFAULT 20' },
            { name: 'suspended_at', type: 'TIMESTAMP' },
            { name: 'suspended_by', type: 'INTEGER' },
            { name: 'suspended_reason', type: 'TEXT' },
            { name: 'terminated_at', type: 'TIMESTAMP' },
            { name: 'terminated_by', type: 'INTEGER' },
            { name: 'terminated_reason', type: 'TEXT' },
            { name: 'scheduled_purge_date', type: 'DATE' },
            { name: 'updated_at', type: 'TIMESTAMP' }
        ];
        for (const col of employeeColumns) {
            try {
                await client.query(`
          ALTER TABLE employees 
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
        `);
                console.log(`  ✓ Added column: ${col.name}`);
            }
            catch (err) {
                console.log(`  ℹ Column ${col.name} already exists or error:`, err.message);
            }
        }
        // ==========================================
        // STEP 2: Migrate existing data
        // ==========================================
        console.log('\n📊 Step 2: Migrating existing data...');
        // Split name into first_name and last_name if needed
        await client.query(`
      UPDATE employees
      SET 
        first_name = COALESCE(
          first_name,
          CASE 
            WHEN name IS NOT NULL AND POSITION(' ' IN name) > 0 
            THEN SUBSTRING(name FROM 1 FOR POSITION(' ' IN name) - 1)
            ELSE name
          END
        ),
        last_name = COALESCE(
          last_name,
          CASE 
            WHEN name IS NOT NULL AND POSITION(' ' IN name) > 0 
            THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
            ELSE ''
          END
        )
      WHERE first_name IS NULL OR last_name IS NULL
    `);
        console.log('  ✓ Migrated name -> first_name + last_name');
        // Migrate department to employee_department
        await client.query(`
      UPDATE employees
      SET employee_department = COALESCE(employee_department, department)
      WHERE employee_department IS NULL AND department IS NOT NULL
    `);
        console.log('  ✓ Migrated department -> employee_department');
        // Migrate salary to base_salary
        await client.query(`
      UPDATE employees
      SET base_salary = COALESCE(base_salary, salary)
      WHERE base_salary IS NULL AND salary IS NOT NULL
    `);
        console.log('  ✓ Migrated salary -> base_salary');
        // Generate employee numbers for any records without them
        const noNumberResult = await client.query(`
      SELECT id FROM employees WHERE employee_number IS NULL ORDER BY id
    `);
        if (noNumberResult.rows.length > 0) {
            console.log(`  ℹ Generating employee numbers for ${noNumberResult.rows.length} records...`);
            // Get the highest existing employee number
            const maxNumResult = await client.query(`
        SELECT employee_number 
        FROM employees 
        WHERE employee_number ~ '^EMP[0-9]+$'
        ORDER BY CAST(SUBSTRING(employee_number FROM 4) AS INTEGER) DESC 
        LIMIT 1
      `);
            let nextNum = 1;
            if (maxNumResult.rows.length > 0) {
                const lastNumber = maxNumResult.rows[0].employee_number;
                nextNum = parseInt(lastNumber.substring(3)) + 1;
            }
            for (const row of noNumberResult.rows) {
                const empNumber = `EMP${nextNum.toString().padStart(5, '0')}`;
                await client.query('UPDATE employees SET employee_number = $1 WHERE id = $2', [empNumber, row.id]);
                nextNum++;
            }
            console.log(`  ✓ Generated ${noNumberResult.rows.length} employee numbers`);
        }
        // ==========================================
        // STEP 3: Check for data issues before constraints
        // ==========================================
        console.log('\n🔍 Step 3: Checking data integrity...');
        // Check for NULL employee numbers
        const nullCheck = await client.query(`
      SELECT COUNT(*) as count FROM employees WHERE employee_number IS NULL
    `);
        if (parseInt(nullCheck.rows[0].count) > 0) {
            console.log(`  ⚠️  Found ${nullCheck.rows[0].count} employees without employee numbers - fixing...`);
            // Get the highest existing employee number
            const maxNumResult = await client.query(`
        SELECT employee_number 
        FROM employees 
        WHERE employee_number ~ '^EMP[0-9]+$'
        ORDER BY CAST(SUBSTRING(employee_number FROM 4) AS INTEGER) DESC 
        LIMIT 1
      `);
            let nextNum = 1;
            if (maxNumResult.rows.length > 0) {
                const lastNumber = maxNumResult.rows[0].employee_number;
                nextNum = parseInt(lastNumber.substring(3)) + 1;
            }
            const nullRows = await client.query(`
        SELECT id FROM employees WHERE employee_number IS NULL ORDER BY id
      `);
            for (const row of nullRows.rows) {
                const empNumber = `EMP${nextNum.toString().padStart(5, '0')}`;
                await client.query('UPDATE employees SET employee_number = $1 WHERE id = $2', [empNumber, row.id]);
                nextNum++;
            }
            console.log(`  ✓ Fixed ${nullRows.rows.length} NULL employee numbers`);
        }
        else {
            console.log('  ✓ No NULL employee numbers found');
        }
        // Check for duplicate employee numbers
        const dupCheck = await client.query(`
      SELECT employee_number, COUNT(*) as count 
      FROM employees 
      WHERE employee_number IS NOT NULL
      GROUP BY employee_number 
      HAVING COUNT(*) > 1
    `);
        if (dupCheck.rows.length > 0) {
            console.log(`  ⚠️  Found ${dupCheck.rows.length} duplicate employee numbers - fixing...`);
            for (const dup of dupCheck.rows) {
                const dups = await client.query(`
          SELECT id FROM employees WHERE employee_number = $1 ORDER BY id
        `, [dup.employee_number]);
                // Keep the first one, renumber the rest
                for (let i = 1; i < dups.rows.length; i++) {
                    const maxNumResult = await client.query(`
            SELECT employee_number 
            FROM employees 
            WHERE employee_number ~ '^EMP[0-9]+$'
            ORDER BY CAST(SUBSTRING(employee_number FROM 4) AS INTEGER) DESC 
            LIMIT 1
          `);
                    let nextNum = 1;
                    if (maxNumResult.rows.length > 0) {
                        const lastNumber = maxNumResult.rows[0].employee_number;
                        nextNum = parseInt(lastNumber.substring(3)) + 1;
                    }
                    const newNumber = `EMP${nextNum.toString().padStart(5, '0')}`;
                    await client.query('UPDATE employees SET employee_number = $1 WHERE id = $2', [newNumber, dups.rows[i].id]);
                }
            }
            console.log('  ✓ Fixed duplicate employee numbers');
        }
        else {
            console.log('  ✓ No duplicate employee numbers found');
        }
        // ==========================================
        // STEP 4: Add constraints and indexes
        // ==========================================
        console.log('\n🔗 Step 4: Adding constraints and indexes...');
        // Check if constraint already exists before adding
        const constraintCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'employees' 
      AND constraint_name = 'employees_employee_number_unique'
    `);
        if (constraintCheck.rows.length === 0) {
            await client.query(`
        ALTER TABLE employees 
        ADD CONSTRAINT employees_employee_number_unique 
        UNIQUE (employee_number)
      `);
            console.log('  ✓ Added UNIQUE constraint on employee_number');
        }
        else {
            console.log('  ℹ Constraint employees_employee_number_unique already exists');
        }
        // Check foreign key constraint
        const fkCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'employees' 
      AND constraint_name = 'employees_user_id_fkey'
    `);
        if (fkCheck.rows.length === 0) {
            await client.query(`
        ALTER TABLE employees 
        ADD CONSTRAINT employees_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      `);
            console.log('  ✓ Added foreign key constraint on user_id');
        }
        else {
            console.log('  ℹ Foreign key employees_user_id_fkey already exists');
        }
        // ==========================================
        // STEP 5: Fix employees ID sequence
        // ==========================================
        console.log('\n🔢 Step 5: Fixing employees ID sequence...');
        const maxIdResult = await client.query(`
      SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM employees
    `);
        const nextId = maxIdResult.rows[0].next_id;
        await client.query(`
      SELECT setval('employees_id_seq', $1, false)
    `, [nextId]);
        console.log(`  ✓ Set employees sequence to ${nextId}`);
        // ==========================================
        // STEP 6: Add account_status to USERS table
        // ==========================================
        console.log('\n👤 Step 6: Adding account_status to users table...');
        // Check what columns exist first
        const userColsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('account_status', 'status_changed_at', 'status_changed_by', 'status_reason')
    `);
        const existingUserCols = userColsCheck.rows.map(r => r.column_name);
        // Add account_status column
        if (!existingUserCols.includes('account_status')) {
            await client.query(`
        ALTER TABLE users 
        ADD COLUMN account_status VARCHAR(20) DEFAULT 'active'
      `);
            console.log('  ✓ Added account_status column');
        }
        else {
            console.log('  ℹ Column account_status already exists');
        }
        // Add status_changed_at column
        if (!existingUserCols.includes('status_changed_at')) {
            await client.query(`
        ALTER TABLE users 
        ADD COLUMN status_changed_at TIMESTAMP
      `);
            console.log('  ✓ Added status_changed_at column');
        }
        else {
            console.log('  ℹ Column status_changed_at already exists');
        }
        // Add status_changed_by column (without FK constraint first)
        if (!existingUserCols.includes('status_changed_by')) {
            await client.query(`
        ALTER TABLE users 
        ADD COLUMN status_changed_by INTEGER
      `);
            console.log('  ✓ Added status_changed_by column');
            // Now add the foreign key constraint separately
            const fkCheckChanged = await client.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'users' 
        AND constraint_name = 'users_status_changed_by_fkey'
      `);
            if (fkCheckChanged.rows.length === 0) {
                await client.query(`
          ALTER TABLE users 
          ADD CONSTRAINT users_status_changed_by_fkey 
          FOREIGN KEY (status_changed_by) REFERENCES users(id)
        `);
                console.log('  ✓ Added foreign key constraint on status_changed_by');
            }
        }
        else {
            console.log('  ℹ Column status_changed_by already exists');
        }
        // Add status_reason column
        if (!existingUserCols.includes('status_reason')) {
            await client.query(`
        ALTER TABLE users 
        ADD COLUMN status_reason TEXT
      `);
            console.log('  ✓ Added status_reason column');
        }
        else {
            console.log('  ℹ Column status_reason already exists');
        }
        // Add check constraint for account_status
        const checkConstraintCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users' 
      AND constraint_name = 'users_account_status_check'
    `);
        if (checkConstraintCheck.rows.length === 0) {
            await client.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_account_status_check 
        CHECK (account_status IN ('active', 'suspended', 'terminated'))
      `);
            console.log('  ✓ Added CHECK constraint on account_status');
        }
        else {
            console.log('  ℹ Constraint users_account_status_check already exists');
        }
        // Set all existing users to active if they're null
        await client.query(`
      UPDATE users 
      SET account_status = 'active' 
      WHERE account_status IS NULL
    `);
        console.log('  ✓ Set all existing users to active status');
        // ==========================================
        // STEP 7: Verify schema
        // ==========================================
        console.log('\n🔍 Step 7: Verifying schema...');
        const schemaCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'employees'
      AND column_name IN ('first_name', 'last_name', 'employee_number', 'user_id', 
                          'employee_department', 'base_salary', 'designation')
      ORDER BY column_name
    `);
        console.log('\n✅ Required columns in employees table:');
        schemaCheck.rows.forEach(row => {
            console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        const usersSchemaCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('account_status', 'status_changed_at', 'status_changed_by', 'status_reason')
      ORDER BY column_name
    `);
        console.log('\n✅ Required columns in users table:');
        usersSchemaCheck.rows.forEach(row => {
            console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        // ==========================================
        // COMMIT
        // ==========================================
        await client.query('COMMIT');
        console.log('\n✅ ========================================');
        console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('✅ ========================================\n');
        console.log('📝 Summary:');
        console.log('   ✓ All required columns added to employees table');
        console.log('   ✓ Existing data migrated to new columns');
        console.log('   ✓ Employee ID sequence fixed');
        console.log('   ✓ Account status columns added to users table');
        console.log('   ✓ All constraints and indexes created');
        console.log('\n🎉 Employee onboarding feature is now ready!');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Migration failed:', error);
        throw error;
    }
    finally {
        client.release();
        await db_1.pool.end();
    }
}
// Run the migration
fixEmployeeOnboarding()
    .then(() => {
    console.log('\n👋 Migration script completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
});
