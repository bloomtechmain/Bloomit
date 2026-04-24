"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRailwayDatabase = initRailwayDatabase;
const db_1 = require("../db");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Railway Database Initialization Script
 * Initializes an empty database structure for Railway deployment
 * Does NOT import any data - only creates tables and schema
 */
// Prevent individual scripts from closing the shared pool during init
;
db_1.pool.end = () => Promise.resolve();
// Prevent individual scripts from killing the process during init
const _originalExit = process.exit.bind(process);
process.exit = () => { };
async function runSqlFile(filePath) {
    console.log(`\n📄 Executing SQL file: ${path_1.default.basename(filePath)}`);
    const sql = fs_1.default.readFileSync(filePath, 'utf8');
    // Split by semicolon and execute statements
    const statements = sql.split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    let successCount = 0;
    let skipCount = 0;
    for (const statement of statements) {
        try {
            await db_1.pool.query(statement);
            successCount++;
        }
        catch (err) {
            // Ignore "relation already exists" errors
            if (err.code === '42P07') {
                skipCount++;
            }
            else if (err.code === '23505') {
                // Ignore unique constraint violations (duplicate data)
                skipCount++;
            }
            else {
                console.error(`   ❌ Error in statement: ${statement.substring(0, 100)}...`);
                console.error(`   Error: ${err.message}`);
            }
        }
    }
    console.log(`   ✅ Executed ${successCount} statements, skipped ${skipCount}`);
}
async function runScript(scriptName) {
    const scriptPath = path_1.default.join(__dirname, scriptName);
    if (!fs_1.default.existsSync(scriptPath)) {
        console.log(`   ⚠️  Script not found: ${scriptName} - Skipping`);
        return;
    }
    console.log(`\n🔧 Running script: ${scriptName}`);
    try {
        // Dynamic import for TypeScript modules
        const module = await Promise.resolve(`${scriptPath}`).then(s => __importStar(require(s)));
        // Try to find and execute the main function
        if (typeof module.default === 'function') {
            await module.default();
        }
        else if (typeof module.main === 'function') {
            await module.main();
        }
        else {
            // Some scripts auto-execute, so we've already imported them
            console.log(`   ✅ Script executed via import`);
        }
    }
    catch (error) {
        // Some errors are expected (table already exists, etc.)
        if (error.code === '42P07' || error.message?.includes('already exists')) {
            console.log(`   ⏭️  Skipped - already exists`);
        }
        else {
            console.error(`   ⚠️  Warning: ${error.message}`);
        }
    }
}
async function initRailwayDatabase() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 Railway Database Initialization');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 Creating empty database structure (no data)');
    console.log('');
    try {
        // Test database connection
        console.log('🔌 Testing database connection...');
        const result = await db_1.pool.query('SELECT NOW()');
        console.log(`✅ Connected to database at ${result.rows[0].now}`);
        // Step 1: Base schema from databasse.sql
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 STEP 1: Creating Base Tables');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const baseSqlPath = path_1.default.resolve(__dirname, '../databasse.sql');
        await runSqlFile(baseSqlPath);
        // Step 2: Create RBAC Tables (must be early - other tables depend on users/roles)
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔐 STEP 2: Creating RBAC System');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        await runScript('createRBACTables.ts');
        await runScript('seedRBAC.ts'); // Seeds roles and permissions
        // Step 3: Create Package/Plan System (must be before users are seeded)
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📦 STEP 3: Creating Package & Plan System');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        await runScript('createPackagesTable.ts');
        await runScript('addPackageToUsers.ts');
        await runScript('createWebAppTables.ts');
        await runScript('createDashboardAdminTable.ts');
        // Step 4: Create Employee and User related tables
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👥 STEP 4: Creating Employee & User Tables');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        await runScript('alterEmployeesTableForPayroll.ts');
        await runScript('addMissingEmployeeColumns.ts');
        await runScript('createEmployeePortalTables.ts');
        await runScript('createEmployeeDocumentsTable.ts');
        // Step 5: Create Financial Tables
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💰 STEP 5: Creating Financial Tables');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        await runScript('createVendorsTable.ts');
        await runScript('createProjectItemsTable.ts');
        await runScript('createPettyCashTable.ts');
        await runScript('createAssetsTable.ts');
        await runScript('createReceivablesTable.ts');
        await runScript('createPayablesTable.ts');
        await runScript('createPaymentPayablesTable.ts');
        await runScript('createBankTransactionsTable.ts');
        await runScript('createDebitCardTable.ts');
        await runScript('createSubscriptionsTable.ts');
        // Step 6: Create Purchase Orders and Quotes
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📦 STEP 6: Creating Purchase Orders & Quotes');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        await runScript('createPurchaseOrdersTable.ts');
        await runScript('createQuotesTables.ts');
        await runScript('createQuoteRemindersTable.ts');
        // Step 7: Create Payroll System
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💵 STEP 7: Creating Payroll System');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        await runScript('createPayrollTables.ts');
        await runScript('createPayslipSignatureTokensTable.ts');
        await runScript('addPayrollIndexes.ts');
        // Step 8: Create Time & PTO Tables
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⏰ STEP 8: Creating Time Tracking & PTO');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        await runScript('createTimeEntriesTable.ts');
        await runScript('createPTORequestsTable.ts');
        await runScript('addPtoAllowanceColumn.ts');
        // Step 9: Create Supporting Tables
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔧 STEP 9: Creating Supporting Tables');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        await runScript('createDocumentsTable.ts');
        await runScript('createNotesTable.ts');
        await runScript('createTodosTable.ts');
        await runScript('createNotificationsTable.ts');
        await runScript('createEmailLogTable.ts');
        await runScript('createApplicationSettingsTable.ts');
        // Step 10: Grant Permissions
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔑 STEP 10: Granting Permissions');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        await runScript('grantPurchaseOrderPermissions.ts');
        await runScript('grantQuotesPermissions.ts');
        await runScript('grantPayrollPermissions.ts');
        await runScript('grantEmployeePortalPermissions.ts');
        // Step 11: Settings and Migrations
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚙️  STEP 11: Applying Settings & Migrations');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        await runScript('addEmailPreferencesToSettings.ts');
        await runScript('addEmployeeDirectorySettings.ts');
        await runScript('createReminderEmailSetting.ts');
        await runScript('addPasswordManagementFeatures.ts');
        // Step 12: Verify Database Structure
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 STEP 12: Verifying Database Structure');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const tablesResult = await db_1.pool.query(`
      SELECT schemaname, tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
        console.log(`\n✅ Database initialized with ${tablesResult.rows.length} tables:`);
        tablesResult.rows.forEach((row) => {
            console.log(`   - ${row.tablename}`);
        });
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ Railway Database Structure Created Successfully!');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('📋 Next Steps:');
        console.log('   1. Run: npm run seed:railway-admin');
        console.log('   2. Deploy your Railway services');
        console.log('   3. Test the application');
        console.log('');
    }
    catch (error) {
        console.error('\n❌ Database initialization failed:', error);
        throw error;
    }
}
// Run if executed directly
if (require.main === module) {
    initRailwayDatabase()
        .then(() => {
        console.log('✅ Done!');
        _originalExit(0);
    })
        .catch((err) => {
        console.error('❌ Failed:', err);
        _originalExit(1);
    });
}
