"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = exports.pool = void 0;
require("dotenv/config");
const pg_1 = require("pg");
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
const query = async (text, params, client) => {
    if (client) {
        return client.query(text, params);
    }
    const newClient = await exports.pool.connect();
    try {
        return await newClient.query(text, params);
    }
    finally {
        newClient.release();
    }
};
exports.query = query;
