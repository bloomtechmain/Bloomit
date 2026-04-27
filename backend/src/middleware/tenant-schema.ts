import { Request, Response, NextFunction } from 'express';

export const tenantSchemaMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.tenantId) {
    return next();
  }

  if (!req.dbClient) {
    return next(new Error('Database client not available on request.'));
  }

  try {
    const { rows } = await req.dbClient.query(
      'SELECT schema_name FROM public.tenants WHERE id = $1',
      [req.user.tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'tenant_not_found' });
    }

    // Verify the requesting user actually belongs to this tenant
    const userCheck = await req.dbClient.query(
      'SELECT id FROM public.users WHERE id = $1 AND tenant_id = $2',
      [req.user.userId, req.user.tenantId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const schemaName = rows[0].schema_name;
    await req.dbClient.query(`SET search_path TO "${schemaName}", public`);

    next();
  } catch (error) {
    next(error);
  }
};
