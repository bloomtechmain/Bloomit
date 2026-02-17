"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function main() {
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS assets (
      id SERIAL PRIMARY KEY,
      asset_name TEXT NOT NULL,
      value NUMERIC NOT NULL,
      purchase_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    console.log('assets table ensured');
}
main()
    .catch((e) => {
    console.error(e);
    process.exitCode = 1;
})
    .finally(() => db_1.pool.end());
