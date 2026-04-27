import { Request, Response, NextFunction } from 'express'

export function requirePermission(resource: string, action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    const requiredPermission = `${resource}:${action}`

    if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({ error: 'forbidden' })
    }

    next()
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    const hasRequiredRole = req.user.roleNames.some(roleName => roles.includes(roleName))

    if (!hasRequiredRole) {
      return res.status(403).json({ error: 'forbidden' })
    }

    next()
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  if (!req.user.roleNames.includes('Super Admin')) {
    return res.status(403).json({ error: 'forbidden' })
  }

  next()
}

export function requireSettingsManage(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  if (!req.user.permissions || !req.user.permissions.includes('settings:manage')) {
    return res.status(403).json({ error: 'forbidden' })
  }

  next()
}
