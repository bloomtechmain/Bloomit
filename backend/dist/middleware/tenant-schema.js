"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantSchemaMiddleware = void 0;
const tenantSchemaMiddleware = async (req, res, next) => {
    if (!req.user || !req.user.tenantId) {
        // This should not happen if the middleware is placed after requireAuth
        return next();
    }
    if (!req.dbClient) {
        // This should not happen if the middleware is placed after dbClientMiddleware
        return next(new Error('Database client not available on request.'));
    }
    try {
        const { rows } = await req.dbClient.query('SELECT schema_name FROM public.tenants WHERE id = $1', [req.user.tenantId]);
        if (rows.length === 0) {
            // This might happen if the tenant is deleted but the user still has a valid token
            return res.status(404).json({ error: 'tenant_not_found', message: 'Tenant not found.' });
        }
        const schemaName = rows[0].schema_name;
        await req.dbClient.query(`SET search_path TO "${schemaName}", public`);
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.tenantSchemaMiddleware = tenantSchemaMiddleware;
