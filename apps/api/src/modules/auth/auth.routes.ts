import { Router } from 'express';

export const authRouter: Router = Router();

/**
 * Day 2 will implement:
 * POST   /auth/register
 * POST   /auth/login
 * POST   /auth/refresh
 * POST   /auth/logout
 * GET    /auth/profile
 * PATCH  /auth/profile
 * POST   /auth/change-password
 */
authRouter.get('/_ping', (_req, res) => {
  res.json({ success: true, data: { module: 'auth', ready: false, day: 2 } });
});
