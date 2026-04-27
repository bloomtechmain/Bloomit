"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function runSqlFile(filePath) {
    console.log(`Executing SQL file: ${filePath}`);
    const sql = fs_1.default.readFileSync(filePath, 'utf8');
    // Split by semicolon to run statements individually
    const statements = sql.split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    for (const statement of statements) {
        try {
            await db_1.pool.query(statement);
        }
        catch (err) {
            // Ignore "relation already exists" error (code 42P07)
            if (err.code === '42P07') {
                console.log(`Table already exists, skipping statement: ${statement.substring(0, 50)}...`);
            }
            else if (err.code === '23505') {
                // Ignore "unique constraint violation" (duplicate data)
                console.log(`Data already exists, skipping statement: ${statement.substring(0, 50)}...`);
            }
            else {
                console.error(`Error executing statement: ${statement.substring(0, 50)}...`);
                throw err;
            }
        }
    }
    console.log(`Executed SQL file: ${filePath}`);
}
async function runTsScript(scriptPath) {
    console.log(`Executing TS script: ${scriptPath}`);
    // We can't easily import and run main() if it's not exported or if it runs automatically.
    // Most scripts in this repo run main() at the end.
    // So we will spawn a child process to run them.
    const { execSync } = require('child_process');
    try {
        // Use npx ts-node to run the script
        execSync(`npx ts-node ${scriptPath}`, { stdio: 'inherit', cwd: path_1.default.resolve(__dirname, '../../') });
        console.log(`Executed TS script: ${scriptPath}`);
    }
    catch (error) {
        console.error(`Error executing TS script: ${scriptPath}`, error);
        throw error;
    }
}
async function main() {
    try {
        // 1. Run databasse.sql (public schema tables only)
        // Note: Typo in filename 'databasse.sql' is intentional as per file on disk
        const databaseSqlPath = path_1.default.resolve(__dirname, '../databasse.sql');
        const fullDbSql = fs_1.default.readFileSync(databaseSqlPath, 'utf8');
        const publicOnlyDbSql = fullDbSql.split('-- TENANT SCHEMA TEMPLATE')[0];
        const tmpPublicDbPath = path_1.default.resolve(__dirname, '../databasse_public_only.tmp.sql');
        fs_1.default.writeFileSync(tmpPublicDbPath, publicOnlyDbSql);
        await runSqlFile(tmpPublicDbPath);
        fs_1.default.unlinkSync(tmpPublicDbPath);
        // 2. Run create...Table.ts scripts
        // Order matters to some extent (dependencies)
        const createScripts = [
            'createEmployeesTable.ts', // Need to find where this is. Wait, is there one?
            'createVendorsTable.ts', // Already in sql, but maybe script has more?
            'createProjectsTable.ts', // Already in sql?
            'createProjectItemsTable.ts',
            'createPettyCashTable.ts', // Creates petty_cash_account
            'createAssetsTable.ts',
            'createReceivablesTable.ts',
            'createPaymentPayablesTable.ts',
            'createTodosTable.ts',
            'createNotesTable.ts',
            'createDebitCardTable.ts',
            'createPayablesTable.ts' // This has IF NOT EXISTS, so it's safe.
        ];
        // I need to check which scripts actually exist.
        const scriptsDir = __dirname;
        const existingScripts = fs_1.default.readdirSync(scriptsDir);
        // Helper to find script
        const findScript = (name) => existingScripts.find(s => s === name);
        // Explicit order for known dependencies
        const orderedScripts = [
            'createVendorsTable.ts',
            'createProjectsTable.ts', // If exists
            'createProjectItemsTable.ts',
            'createPettyCashTable.ts',
            'createAssetsTable.ts',
            'createReceivablesTable.ts',
            'createPaymentPayablesTable.ts',
            'createTodosTable.ts',
            'createNotesTable.ts',
            'createDebitCardTable.ts',
            'createPayablesTable.ts', // Dependent on vendors and projects
            // Add others that might be there
        ];
        // Add any other create...Table.ts that I missed
        for (const file of existingScripts) {
            if (file.startsWith('create') && file.endsWith('Table.ts') && !orderedScripts.includes(file)) {
                orderedScripts.push(file);
            }
        }
        for (const scriptName of orderedScripts) {
            if (existingScripts.includes(scriptName)) {
                await runTsScript(path_1.default.join(scriptsDir, scriptName));
            }
            else {
                console.log(`Script not found (skipping): ${scriptName}`);
            }
        }
        // 3. Run alter...Table.ts scripts
        const alterScripts = existingScripts.filter(s => s.startsWith('alter') && s.endsWith('.ts'));
        for (const scriptName of alterScripts) {
            await runTsScript(path_1.default.join(scriptsDir, scriptName));
        }
        // 4. Run seedAdmin.ts
        if (existingScripts.includes('seedAdmin.ts')) {
            await runTsScript(path_1.default.join(scriptsDir, 'seedAdmin.ts'));
        }
        // 5. Run seedSampleData.sql
        // Check if it exists
        const seedSqlPath = path_1.default.join(scriptsDir, 'seedSampleData.sql');
        if (fs_1.default.existsSync(seedSqlPath)) {
            await runSqlFile(seedSqlPath);
        }
        console.log('Database initialization completed successfully.');
    }
    catch (err) {
        console.error('Database initialization failed:', err);
        process.exit(1);
    }
    finally {
        await db_1.pool.end();
    }
}
main();
