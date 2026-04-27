"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
/**
 * Verify Railway Employee Portal Fix
 *
 * This comprehensive verification script checks that all fixes have been applied:
 * 1. international_timezone setting exists
 * 2. employee_audit_log.session_id column exists
 * 3. time_entries table has correct schema
 * 4. All employee portal tables exist
 * 5. Database connectivity works
 */
async function verifyRailwayPortalFix() {
    const client = await db_1.pool.connect();
    const results = {
        passed: 0,
        failed: 0,
        warnings: 0,
        tests: []
    };
    const addTest = (name, status, message, details) => {
        results.tests.push({ name, status, message, details });
        if (status === 'PASS')
            results.passed++;
        else if (status === 'FAIL')
            results.failed++;
        else
            results.warnings++;
    };
    try {
        console.log('🔍 Railway Employee Portal - Verification Report');
        console.log('================================================\n');
        // ==================== TEST 1: Database Connection ====================
        console.log('📝 Test 1: Database Connection...');
        try {
            const result = await client.query('SELECT NOW()');
            addTest('Database Connection', 'PASS', 'Successfully connected to database', { timestamp: result.rows[0].now });
            console.log('✅ PASS: Database connection working\n');
        }
        catch (error) {
            addTest('Database Connection', 'FAIL', 'Failed to connect to database', { error });
            console.log('❌ FAIL: Database connection failed\n');
        }
        // ==================== TEST 2: international_timezone Setting ====================
        console.log('📝 Test 2: international_timezone Setting...');
        try {
            const result = await client.query('SELECT * FROM application_settings WHERE setting_key = $1', ['international_timezone']);
            if (result.rows.length > 0) {
                addTest('international_timezone Setting', 'PASS', `Setting exists with value: ${result.rows[0].setting_value}`, result.rows[0]);
                console.log(`✅ PASS: Setting exists (${result.rows[0].setting_value})\n`);
            }
            else {
                addTest('international_timezone Setting', 'FAIL', 'Setting does not exist');
                console.log('❌ FAIL: Setting missing\n');
            }
        }
        catch (error) {
            addTest('international_timezone Setting', 'FAIL', 'Error checking setting', { error });
            console.log('❌ FAIL: Error checking setting\n');
        }
        // ==================== TEST 3: employee_audit_log.session_id ====================
        console.log('📝 Test 3: employee_audit_log.session_id Column...');
        try {
            const result = await client.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = 'employee_audit_log' 
        AND column_name = 'session_id'
      `);
            if (result.rows.length > 0) {
                addTest('employee_audit_log.session_id', 'PASS', 'Column exists', result.rows[0]);
                console.log('✅ PASS: session_id column exists\n');
            }
            else {
                addTest('employee_audit_log.session_id', 'FAIL', 'Column does not exist');
                console.log('❌ FAIL: session_id column missing\n');
            }
        }
        catch (error) {
            addTest('employee_audit_log.session_id', 'FAIL', 'Error checking column', { error });
            console.log('❌ FAIL: Error checking column\n');
        }
        // ==================== TEST 4: time_entries Schema ====================
        console.log('📝 Test 4: time_entries Table Schema...');
        try {
            const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'time_entries'
        ORDER BY ordinal_position
      `);
            const columnNames = columns.rows.map(r => r.column_name);
            const requiredColumns = ['id', 'employee_id', 'project_id', 'date', 'total_hours', 'status'];
            const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
            if (missingColumns.length === 0) {
                if (columnNames.includes('total_hours')) {
                    addTest('time_entries Schema', 'PASS', 'All required columns exist, including total_hours', { totalColumns: columns.rows.length, columns: columnNames });
                    console.log('✅ PASS: Schema correct (total_hours column exists)\n');
                }
                else if (columnNames.includes('hours')) {
                    addTest('time_entries Schema', 'WARN', 'Column is named "hours" instead of "total_hours" (controller expects total_hours)', { columnNames });
                    console.log('⚠️  WARN: Column named "hours" (should be "total_hours")\n');
                }
            }
            else {
                addTest('time_entries Schema', 'FAIL', `Missing required columns: ${missingColumns.join(', ')}`, { missingColumns });
                console.log(`❌ FAIL: Missing columns: ${missingColumns.join(', ')}\n`);
            }
        }
        catch (error) {
            addTest('time_entries Schema', 'FAIL', 'Error checking schema', { error });
            console.log('❌ FAIL: Error checking schema\n');
        }
        // ==================== TEST 5: Employee Portal Tables ====================
        console.log('📝 Test 5: Employee Portal Tables Exist...');
        const portalTables = [
            'employee_portal_settings',
            'announcements',
            'employee_documents',
            'employee_notifications',
            'employee_audit_log'
        ];
        let allTablesExist = true;
        for (const tableName of portalTables) {
            try {
                const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [tableName]);
                if (result.rows[0].exists) {
                    console.log(`   ✅ ${tableName}`);
                }
                else {
                    console.log(`   ❌ ${tableName} - MISSING`);
                    allTablesExist = false;
                }
            }
            catch (error) {
                console.log(`   ❌ ${tableName} - ERROR`);
                allTablesExist = false;
            }
        }
        if (allTablesExist) {
            addTest('Employee Portal Tables', 'PASS', 'All required tables exist');
            console.log('✅ PASS: All employee portal tables exist\n');
        }
        else {
            addTest('Employee Portal Tables', 'FAIL', 'Some tables are missing');
            console.log('❌ FAIL: Some tables missing\n');
        }
        // ==================== TEST 6: employee_portal_settings Columns ====================
        console.log('📝 Test 6: employee_portal_settings Extended Columns...');
        try {
            const columns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employee_portal_settings'
      `);
            const columnNames = columns.rows.map(r => r.column_name);
            const requiredColumns = ['email_preferences', 'show_in_directory', 'hide_phone_in_directory'];
            const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
            if (missingColumns.length === 0) {
                addTest('employee_portal_settings Columns', 'PASS', 'All extended columns exist', { columns: columnNames });
                console.log('✅ PASS: Extended columns exist\n');
            }
            else {
                addTest('employee_portal_settings Columns', 'WARN', `Missing optional columns: ${missingColumns.join(', ')}`, { missingColumns });
                console.log(`⚠️  WARN: Missing columns: ${missingColumns.join(', ')}\n`);
            }
        }
        catch (error) {
            addTest('employee_portal_settings Columns', 'FAIL', 'Error checking columns', { error });
            console.log('❌ FAIL: Error checking columns\n');
        }
        // ==================== TEST 7: employee_documents Schema ====================
        console.log('📝 Test 7: employee_documents Schema...');
        try {
            const columns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employee_documents'
      `);
            const columnNames = columns.rows.map(r => r.column_name);
            if (columnNames.includes('document_id') || columnNames.includes('id')) {
                if (columnNames.includes('original_name')) {
                    addTest('employee_documents Schema', 'PASS', 'Table has correct schema with original_name column', { columns: columnNames });
                    console.log('✅ PASS: Schema correct\n');
                }
                else {
                    addTest('employee_documents Schema', 'WARN', 'Missing original_name column', { columns: columnNames });
                    console.log('⚠️  WARN: Missing original_name column\n');
                }
            }
            else {
                addTest('employee_documents Schema', 'FAIL', 'Table structure incorrect');
                console.log('❌ FAIL: Table structure incorrect\n');
            }
        }
        catch (error) {
            addTest('employee_documents Schema', 'FAIL', 'Error checking schema', { error });
            console.log('❌ FAIL: Error checking schema\n');
        }
        // ==================== TEST 8: Test Basic Queries ====================
        console.log('📝 Test 8: Test Basic Queries...');
        try {
            // Test settings query
            await client.query('SELECT * FROM application_settings LIMIT 1');
            // Test employee portal query
            await client.query('SELECT * FROM employee_portal_settings LIMIT 1');
            // Test time entries query
            await client.query('SELECT id, total_hours FROM time_entries LIMIT 1');
            addTest('Basic Queries', 'PASS', 'All basic queries execute successfully');
            console.log('✅ PASS: Basic queries working\n');
        }
        catch (error) {
            addTest('Basic Queries', 'FAIL', 'Query execution failed', {
                error: error.message
            });
            console.log('❌ FAIL: Query failed\n');
        }
        // ==================== SUMMARY ====================
        console.log('\n' + '='.repeat(60));
        console.log('📊 VERIFICATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Passed:  ${results.passed}`);
        console.log(`❌ Failed:  ${results.failed}`);
        console.log(`⚠️  Warnings: ${results.warnings}`);
        console.log(`📝 Total Tests: ${results.tests.length}`);
        console.log('='.repeat(60) + '\n');
        if (results.failed === 0) {
            console.log('🎉 SUCCESS: All critical tests passed!');
            console.log('The Railway employee portal should now load correctly.');
            if (results.warnings > 0) {
                console.log(`\n⚠️  Note: ${results.warnings} warning(s) detected - review for optimization`);
            }
        }
        else {
            console.log(`❌ FAILURE: ${results.failed} test(s) failed`);
            console.log('The employee portal may not load correctly.');
            console.log('\nFailed Tests:');
            results.tests
                .filter(t => t.status === 'FAIL')
                .forEach(t => {
                console.log(`  - ${t.name}: ${t.message}`);
            });
        }
        // ==================== DETAILED REPORT ====================
        console.log('\n' + '='.repeat(60));
        console.log('📋 DETAILED TEST RESULTS');
        console.log('='.repeat(60));
        results.tests.forEach((test, index) => {
            const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
            console.log(`\n${index + 1}. ${icon} ${test.name}`);
            console.log(`   Status: ${test.status}`);
            console.log(`   Message: ${test.message}`);
            if (test.details) {
                console.log(`   Details: ${JSON.stringify(test.details, null, 2).split('\n').join('\n   ')}`);
            }
        });
        console.log('\n' + '='.repeat(60));
        return results.failed === 0;
    }
    catch (error) {
        console.error('❌ Verification script encountered an error:', error);
        return false;
    }
    finally {
        client.release();
    }
}
// Run if executed directly
if (require.main === module) {
    verifyRailwayPortalFix()
        .then((success) => {
        console.log(`\n${success ? '✅' : '❌'} Verification ${success ? 'completed successfully' : 'failed'}`);
        process.exit(success ? 0 : 1);
    })
        .catch((error) => {
        console.error('\n❌ Verification script failed:', error);
        process.exit(1);
    });
}
exports.default = verifyRailwayPortalFix;
