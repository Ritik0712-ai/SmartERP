import { Router, Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { ok, created, noContent } from '../../middleware/response';
import {
  listUserCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
} from './company.service';

export const companyRouter: Router = Router();

// All company routes require authentication
companyRouter.use(requireAuth);

const companyIdParamSchema = z.object({
  id: z.string().uuid('Invalid company id'),
});

/**
 * GET /companies
 * List all companies the authenticated user has access to.
 * Same data as /companies/select — used by the company selection screen
 * and by the top-bar company switcher.
 */
companyRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const companies = await listUserCompanies(userId);
    return ok(res, { companies, total: companies.length });
  }),
);

companyRouter.get(
  '/select',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const companies = await listUserCompanies(userId);
    return ok(res, { companies, total: companies.length });
  }),
);

/**
 * GET /companies/:id
 * Get details of a single company.
 */
companyRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = companyIdParamSchema.parse(req.params);
    const userId = req.user!.sub;
    const company = await getCompany(userId, id);
    return ok(res, company);
  }),
);

/**
 * POST /companies
 * Create a new company. User becomes ADMIN. Max 5 per user.
 */
companyRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const company = await createCompany(userId, req.body, req);
    return created(res, company);
  }),
);

/**
 * PATCH /companies/:id
 * Update company info. ADMIN only.
 */
companyRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = companyIdParamSchema.parse(req.params);
    const userId = req.user!.sub;
    const company = await updateCompany(userId, id, req.body, req);
    return ok(res, company);
  }),
);

/**
 * DELETE /companies/:id
 * Soft delete a company. ADMIN only.
 */
companyRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = companyIdParamSchema.parse(req.params);
    const userId = req.user!.sub;
    await deleteCompany(userId, id, req);
    return noContent(res);
  }),
);
