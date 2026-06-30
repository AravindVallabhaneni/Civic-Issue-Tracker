import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { HttpError } from './errorHandler';
import { logger } from '../config/logger';

/**
 * Middleware to verify Supabase JWT and attach user info to request.
 * Works by verifying the Bearer token against Supabase Auth.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Missing or invalid authorization header', 'UNAUTHORIZED'));
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return next(new HttpError(401, 'Invalid or expired token', 'INVALID_TOKEN'));
    }

    // Fetch profile to get role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, department_id')
      .eq('id', user.id)
      .single();

    req.userId = user.id;
    req.userRole = (profile as { role: string; department_id: string | null } | null)?.role || 'citizen';
    (req as Request & { departmentId?: string }).departmentId = (profile as { role: string; department_id: string | null } | null)?.department_id || undefined;

    logger.debug({ userId: user.id, role: req.userRole }, 'User authenticated');
    next();
  } catch (error) {
    next(new HttpError(401, 'Authentication failed', 'AUTH_FAILED'));
  }
}

/**
 * Middleware to require a specific role or higher.
 * Role hierarchy: admin > department_staff > citizen
 */
const ROLE_LEVEL: Record<string, number> = {
  citizen: 1,
  department_staff: 2,
  admin: 3,
};

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRole = req.userRole || 'citizen';
    const requiredLevel = Math.min(...roles.map((r) => ROLE_LEVEL[r] || 0));
    const userLevel = ROLE_LEVEL[userRole] || 0;

    if (userLevel < requiredLevel) {
      return next(
        new HttpError(403, `This action requires one of: ${roles.join(', ')}`, 'FORBIDDEN')
      );
    }
    next();
  };
}

/**
 * Optional auth — attaches user if token present, but doesn't fail if not.
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (user) {
      req.userId = user.id;
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      req.userRole = (profile as { role: string } | null)?.role || 'citizen';
    }
  } catch {
    // Ignore auth errors for optional auth
  }
  next();
}
