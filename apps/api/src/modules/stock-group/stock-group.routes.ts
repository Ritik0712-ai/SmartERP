import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ok, created } from '../../middleware/response';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../config/prisma';
import {
  listStockGroups,
  getStockGroup,
  createStockGroup,
  updateStockGroup,
  deleteStockGroup,
  createStockGroupSchema,
  updateStockGroupSchema,
  listQuerySchema,
} from './stock-group.service';

export const stockGroupRouter: Router = Router();
stockGroupRouter.use(requireAuth);

async function ensureAccess(userId: string, companyId: string) {
  const role = await prisma.userCompanyRole.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });
  if (!role || !role.isActive) {
    const err: any = new Error('No access to this company');
    err.statusCode = 403;
    throw err;
  }
}

stockGroupRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);
    await ensureAccess(req.user!.sub, q.companyId);
    const groups = await listStockGroups(q.companyId, q.includeInactive);
    return ok(res, { groups });
  }),
);

stockGroupRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    await ensureAccess(req.user!.sub, companyId);
    const group = await getStockGroup(companyId, req.params.id);
    return ok(res, group);
  }),
);

stockGroupRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    const data = createStockGroupSchema.parse(req.body);
    await ensureAccess(req.user!.sub, companyId);
    const group = await createStockGroup(req.user!.sub, companyId, data, req);
    return created(res, group);
  }),
);

stockGroupRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    const data = updateStockGroupSchema.parse(req.body);
    await ensureAccess(req.user!.sub, companyId);
    const group = await updateStockGroup(req.user!.sub, companyId, req.params.id, data, req);
    return ok(res, group);
  }),
);

stockGroupRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    await ensureAccess(req.user!.sub, companyId);
    await deleteStockGroup(req.user!.sub, companyId, req.params.id, req);
    return res.status(204).send();
  }),
);
