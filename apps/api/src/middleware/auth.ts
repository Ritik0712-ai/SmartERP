import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyAccessToken, AccessTokenPayload } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { prisma } from '../config/prisma';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload & { role?: UserRole };
    }
  }
}

/**
 * requireAuth — verifies the access token from Authorization header.
 * Attaches the decoded payload to req.user.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof Error && (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError')) {
      next(new UnauthorizedError('Invalid or expired token'));
      return;
    }
    next(err);
  }
}

/**
 * requireRole — check that the current user has one of the allowed roles.
 * Must be used after requireAuth.
 */
export function requireRole(...allowed: UserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError('Not authenticated');
      const userId = req.user.sub;
      // We don't have company context yet, so we just check if the user is "globally" any of the roles.
      // For company-specific role checks, use requireCompanyRole().
      const roles = await prisma.userCompanyRole.findMany({
        where: { userId, isActive: true },
        select: { role: true },
      });
      const hasRole = roles.some((r) => allowed.includes(r.role));
      if (!hasRole) {
        throw new ForbiddenError(`Requires one of roles: ${allowed.join(', ')}`);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * requireCompanyRole — check that the user has one of the allowed roles
 * for a specific company. Pass the companyId via req.body.companyId, req.params.companyId, or req.query.companyId.
 */
export function requireCompanyRole(companyIdFrom: 'param' | 'body' | 'query', ...allowed: UserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError('Not authenticated');
      const userId = req.user.sub;
      const companyId =
        companyIdFrom === 'param'
          ? (req.params.companyId as string)
          : companyIdFrom === 'body'
            ? (req.body as Record<string, unknown>).companyId
            : (req.query.companyId as string);
      if (!companyId) throw new ForbiddenError('companyId is required');

      const role = await prisma.userCompanyRole.findUnique({
        where: { userId_companyId: { userId, companyId: String(companyId) } },
        select: { role: true, isActive: true },
      });
      if (!role || !role.isActive) {
        throw new ForbiddenError('No access to this company');
      }
      if (!allowed.includes(role.role)) {
        throw new ForbiddenError(`Requires one of roles in this company: ${allowed.join(', ')}`);
      }
      req.user!.role = role.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * requireCompanyAccess — verify the user belongs to the given company
 * (any role, just need access). Use for read operations.
 */
export function requireCompanyAccess(companyIdFrom: 'param' | 'body' | 'query') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError('Not authenticated');
      const userId = req.user.sub;
      const companyId =
        companyIdFrom === 'param'
          ? (req.params.companyId as string)
          : companyIdFrom === 'body'
            ? (req.body as Record<string, unknown>).companyId
            : (req.query.companyId as string);
      if (!companyId) throw new ForbiddenError('companyId is required');

      const role = await prisma.userCompanyRole.findUnique({
        where: { userId_companyId: { userId, companyId: String(companyId) } },
        select: { role: true, isActive: true },
      });
      if (!role || !role.isActive) {
        throw new ForbiddenError('No access to this company');
      }
      req.user!.role = role.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
