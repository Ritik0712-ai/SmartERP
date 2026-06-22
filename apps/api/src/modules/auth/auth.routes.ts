import { Router, Request } from 'express';
import { ok, created, noContent } from '../../middleware/response';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';
import { z } from 'zod';
import {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
  getProfile,
  changePassword,
} from './auth.service';

export const authRouter: Router = Router();

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

function reqMeta(req: Request) {
  return {
    ip: (req.ip || req.headers['x-forwarded-for']?.toString() || '').slice(0, 255),
    userAgent: (req.headers['user-agent'] || '').slice(0, 500),
  };
}

// POST /auth/register
authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const result = await registerUser(req.body, reqMeta(req));
    return created(res, result);
  }),
);

// POST /auth/login
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const result = await loginUser(req.body, reqMeta(req));
    return ok(res, result);
  }),
);

// POST /auth/refresh
authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const result = await refreshTokens(req.body, reqMeta(req));
    return ok(res, result);
  }),
);

// POST /auth/logout
authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const refreshToken = req.body?.refreshToken as string | undefined;
    await logoutUser(userId, refreshToken);
    return noContent(res);
  }),
);

// GET /auth/profile
authRouter.get(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const profile = await getProfile(userId);
    return ok(res, profile);
  }),
);

// POST /auth/change-password
authRouter.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);
    await changePassword(userId, oldPassword, newPassword);
    return ok(res, { message: 'Password changed successfully. Please log in again.' });
  }),
);
