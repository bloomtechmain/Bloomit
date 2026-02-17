"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../db");
async function main() {
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT now()
    );
  `);
    const name = 'admin';
    const email = 'admin@example.com';
    const password = 'admin123';
    const role = 'admin';
    const hash = await bcryptjs_1.default.hash(password, 10);
    const r = await db_1.pool.query(`INSERT INTO users(name,email,password_hash,role)
     VALUES($1,$2,$3,$4)
     ON CONFLICT(email) DO NOTHING
     RETURNING id`, [name, email, hash, role]);
    console.log('inserted_rows', r.rowCount);
    const check = await db_1.pool.query(`SELECT id,name,email,password_hash,role FROM users WHERE email=$1 OR name=$2 LIMIT 1`, [email, name]);
    if (!check.rows.length) {
        console.log('login_check', 'user_not_found');
    }
    else {
        const u = check.rows[0];
        const ok = await bcryptjs_1.default.compare(password, u.password_hash);
        console.log('login_check', ok ? 'ok' : 'fail');
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exitCode = 1;
})
    .finally(() => db_1.pool.end());
