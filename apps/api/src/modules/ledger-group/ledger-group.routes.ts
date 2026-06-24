import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ok, created } from '../../middleware/response';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../config/prisma';
import {
  listLedgerGroups,
  getLedgerGroup,
  createLedgerGroup,
  updateLedgerGroup,
  deleteLedgerGroup,
  listQuerySchema,
  createLedgerGroupSchema,
  updateLedgerGroupSchema,
} from './ledger-group.service';

export const ledgerGroupRouter: Router = Router();

ledgerGroupRouter.use(requireAuth);

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

ledgerGroupRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);
    await ensureAccess(req.user!.sub, q.companyId);
    const groups = await listLedgerGroups(q.companyId, q);
    return ok(res, { groups, total: groups.length });
  }),
);

ledgerGroupRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.query as { companyId: string };
    await ensureAccess(req.user!.sub, companyId);
    const group = await getLedgerGroup(companyId, id);
    return ok(res, group);
  }),
);

ledgerGroupRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    const data = createLedgerGroupSchema.parse(req.body);
    await ensureAccess(req.user!.sub, companyId);
    const g = await createLedgerGroup(req.user!.sub, companyId, data, req);
    return created(res, g);
  }),
);

ledgerGroupRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.query as { companyId: string };
    const data = updateLedgerGroupSchema.parse(req.body);
    await ensureAccess(req.user!.sub, companyId);
    const g = await updateLedgerGroup(req.user!.sub, companyId, id, data, req);
    return ok(res, g);
  }),
);

ledgerGroupRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.query as { companyId: string };
    await ensureAccess(req.user!.sub, companyId);
    await deleteLedgerGroup(req.user!.sub, companyId, id, req);
    return res.status(204).send();
  }),
);
