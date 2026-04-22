
import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { PoolClient } from 'pg';

declare global {
  namespace Express {
    interface Request {
      dbClient?: PoolClient;
    }
  }
}

export const dbClientMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.dbClient = await pool.connect();
    res.on('finish', async () => {
      if (req.dbClient) {
        // Reset search_path before returning to the pool so tenant-scoped
        // connections don't bleed into unrelated requests.
        try { await req.dbClient!.query('SET search_path TO DEFAULT') } catch (_) { /* ignore */ }
        req.dbClient.release();
      }
    });
    next();
  } catch (error) {
    next(error);
  }
};
