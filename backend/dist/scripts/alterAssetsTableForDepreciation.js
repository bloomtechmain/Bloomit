"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function main() {
    await db_1.pool.query(`
    ALTER TABLE assets
    ADD COLUMN IF NOT EXISTS depreciation_method TEXT CHECK (depreciation_method IN ('STRAIGHT_LINE', 'DOUBLE_DECLINING', NULL)),
    ADD COLUMN IF NOT EXISTS salvage_value NUMERIC,
    ADD COLUMN IF NOT EXISTS useful_life INTEGER;
  `);
    console.log('Assets table altered with depreciation columns');
}
main()
    .catch((e) => {
    console.error(e);
    process.exitCode = 1;
})
    .finally(() => db_1.pool.end());
