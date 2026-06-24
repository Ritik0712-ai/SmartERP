import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, BadRequestError } from '../../middleware/errorHandler';
import { ok } from '../../middleware/response';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../config/prisma';
import {
  getKpis,
  getSalesChart,
  getRecentVouchers,
  getTopCustomers,
  getTopItems,
} from './dashboard.service';

export const dashboardRouter: Router = Router();

dashboardRouter.use(requireAuth);

const companyIdQuery = z.object({
  companyId: z.string().uuid('Invalid companyId'),
  from: z.string().optional(),
  to: z.string().optional(),
});

const monthsQuery = z.object({
  companyId: z.string().uuid('Invalid companyId'),
  months: z.coerce.number().int().min(1).max(24).default(6),
});

const limitQuery = z.object({
  companyId: z.string().uuid('Invalid companyId'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/** Verify the user has access to the company */
async function ensureAccess(userId: string, companyId: string) {
  const role = await prisma.userCompanyRole.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });
  if (!role || !role.isActive) {
    throw new BadRequestError('No access to this company');
  }
}

dashboardRouter.get(
  '/kpis',
  asyncHandler(async (req, res) => {
    const { companyId, from, to } = companyIdQuery.parse(req.query);
    const userId = req.user!.sub;
    await ensureAccess(userId, companyId);
    const data = await getKpis(companyId, from, to);
    return ok(res, data);
  }),
);

dashboardRouter.get(
  '/sales-chart',
  asyncHandler(async (req, res) => {
    const { companyId, months } = monthsQuery.parse(req.query);
    const userId = req.user!.sub;
    await ensureAccess(userId, companyId);
    const data = await getSalesChart(companyId, months);
    return ok(res, { points: data });
  }),
);

dashboardRouter.get(
  '/recent-vouchers',
  asyncHandler(async (req, res) => {
    const { companyId, limit } = limitQuery.parse(req.query);
    const userId = req.user!.sub;
    await ensureAccess(userId, companyId);
    const data = await getRecentVouchers(companyId, limit);
    return ok(res, { vouchers: data });
  }),
);

dashboardRouter.get(
  '/top-customers',
  asyncHandler(async (req, res) => {
    const { companyId, limit } = limitQuery.parse(req.query);
    const userId = req.user!.sub;
    await ensureAccess(userId, companyId);
    const data = await getTopCustomers(companyId, limit);
    return ok(res, { customers: data });
  }),
);

dashboardRouter.get(
  '/top-items',
  asyncHandler(async (req, res) => {
    const { companyId, limit } = limitQuery.parse(req.query);
    const userId = req.user!.sub;
    await ensureAccess(userId, companyId);
    const data = await getTopItems(companyId, limit);
    return ok(res, { items: data });
  }),
);
