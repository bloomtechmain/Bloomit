"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function main() {
    console.log('🔧 Creating Bloom Audit Web tables...');
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      user_name  VARCHAR(255) NOT NULL,
      message    TEXT NOT NULL,
      channel    VARCHAR(50) DEFAULT 'general',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    console.log('✅ messages table ready');
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS enterprise_inquiries (
      id           SERIAL PRIMARY KEY,
      name         VARCHAR(100) NOT NULL,
      email        VARCHAR(100) NOT NULL,
      phone        VARCHAR(50)  NOT NULL,
      company_name VARCHAR(100) NOT NULL,
      requirements TEXT NOT NULL,
      status       VARCHAR(20)  DEFAULT 'pending',
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    console.log('✅ enterprise_inquiries table ready');
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS upgrade_requests (
      id             SERIAL PRIMARY KEY,
      user_id        INTEGER REFERENCES users(id),
      user_name      VARCHAR(100) NOT NULL,
      user_email     VARCHAR(100) NOT NULL,
      current_plan   VARCHAR(50),
      requested_plan VARCHAR(50)  NOT NULL,
      requirements   TEXT,
      status         VARCHAR(20)  DEFAULT 'pending',
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    console.log('✅ upgrade_requests table ready');
    console.log('🎉 Bloom Audit Web tables created successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Error creating web app tables:', e);
    process.exitCode = 1;
})
    .finally(() => db_1.pool.end());
