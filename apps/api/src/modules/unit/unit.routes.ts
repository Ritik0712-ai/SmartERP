import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ok, created } from '../../middleware/response';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../config/prisma';
import {
  listUnits,
  getUnit,
  createUnit,
  updateUnit,
  deleteUnit,
  createUnitSchema,
  updateUnitSchema,
  listQuerySchema,
} from './unit.service';

export const unitRouter: Router = Router();
unitRouter.use(requireAuth);

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

unitRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);
    await ensureAccess(req.user!.sub, q.companyId);
    const units = await listUnits(q.companyId, q.includeInactive);
    return ok(res, { units });
  }),
);

unitRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    await ensureAccess(req.user!.sub, companyId);
    const unit = await getUnit(companyId, req.params.id);
    return ok(res, unit);
  }),
);

unitRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    const data = createUnitSchema.parse(req.body);
    await ensureAccess(req.user!.sub, companyId);
    const unit = await createUnit(req.user!.sub, companyId, data, req);
    return created(res, unit);
  }),
);

unitRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    const data = updateUnitSchema.parse(req.body);
    await ensureAccess(req.user!.sub, companyId);
    const unit = await updateUnit(req.user!.sub, companyId, req.params.id, data, req);
    return ok(res, unit);
  }),
);

unitRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    await ensureAccess(req.user!.sub, companyId);
    await deleteUnit(req.user!.sub, companyId, req.params.id, req);
    return res.status(204).send();
  }),
);
