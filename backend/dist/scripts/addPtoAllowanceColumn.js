"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
/**
 * Database Migration: Add PTO Allowance Column to Employees Table
 *
 * This migration adds a pto_allowance column to store each employee's
 * annual leave entitlement (in days). Default is 20 days.
 */
async function addPtoAllowanceColumn() {
    try {
        console.log('🔄 Starting migration: Add pto_allowance column to employees table...');
        // Check if column already exists
        const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'employees' 
        AND column_name = 'pto_allowance'
      );
    `;
        const checkResult = await db_1.pool.query(checkQuery);
        if (checkResult.rows[0].exists) {
            console.log('✅ Column pto_allowance already exists. Skipping migration.');
            process.exit(0);
        }
        // Add the column
        console.log('📝 Adding pto_allowance column...');
        const addColumnQuery = `
      ALTER TABLE employees 
      ADD COLUMN IF NOT EXISTS pto_allowance INTEGER DEFAULT 20 NOT NULL;
    `;
        await db_1.pool.query(addColumnQuery);
        console.log('✅ Column added successfully');
        // Add a comment to the column for documentation
        const commentQuery = `
      COMMENT ON COLUMN employees.pto_allowance IS 
      'Annual PTO/leave allowance in days for this employee';
    `;
        await db_1.pool.query(commentQuery);
        console.log('✅ Column comment added');
        // Update existing employees to have 20 days (default)
        const updateQuery = `
      UPDATE employees 
      SET pto_allowance = 20 
      WHERE pto_allowance IS NULL;
    `;
        const updateResult = await db_1.pool.query(updateQuery);
        console.log(`✅ Updated ${updateResult.rowCount} existing employee records with default 20 days`);
        // Verify the migration
        const verifyQuery = `
      SELECT COUNT(*) as total, 
             MIN(pto_allowance) as min_allowance,
             MAX(pto_allowance) as max_allowance,
             AVG(pto_allowance) as avg_allowance
      FROM employees;
    `;
        const verifyResult = await db_1.pool.query(verifyQuery);
        console.log('📊 Verification Results:');
        console.log('   Total Employees:', verifyResult.rows[0].total);
        console.log('   Min PTO Allowance:', verifyResult.rows[0].min_allowance);
        console.log('   Max PTO Allowance:', verifyResult.rows[0].max_allowance);
        console.log('   Avg PTO Allowance:', parseFloat(verifyResult.rows[0].avg_allowance).toFixed(1));
        console.log('✅ Migration completed successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error during migration:', error);
        process.exit(1);
    }
}
addPtoAllowanceColumn();
