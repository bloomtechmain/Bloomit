"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbClientMiddleware = void 0;
const db_1 = require("../db");
const dbClientMiddleware = async (req, res, next) => {
    try {
        req.dbClient = await db_1.pool.connect();
        res.on('finish', async () => {
            if (req.dbClient) {
                // Reset search_path before returning to the pool so tenant-scoped
                // connections don't bleed into unrelated requests.
                try {
                    await req.dbClient.query('SET search_path TO DEFAULT');
                }
                catch (_) { /* ignore */ }
                req.dbClient.release();
            }
        });
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.dbClientMiddleware = dbClientMiddleware;
