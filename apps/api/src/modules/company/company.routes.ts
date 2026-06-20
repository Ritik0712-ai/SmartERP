import { Router } from 'express';

export const companyRouter: Router = Router();

/**
 * Day 3 will implement:
 * GET    /companies
 * POST   /companies
 * GET    /companies/:id
 * PATCH  /companies/:id
 * DELETE /companies/:id (soft)
 * GET    /companies/select
 */
companyRouter.get('/_ping', (_req, res) => {
  res.json({ success: true, data: { module: 'company', ready: false, day: 3 } });
});
