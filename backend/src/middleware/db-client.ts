
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
    res.on('finish', () => {
      if (req.dbClient) {
        req.dbClient.release();
      }
    });
    next();
  } catch (error) {
    next(error);
  }
};
