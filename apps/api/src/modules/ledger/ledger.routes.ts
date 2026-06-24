import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ok, created } from '../../middleware/response';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../config/prisma';
import {
  listLedgers,
  getLedger,
  createLedger,
  updateLedger,
  deleteLedger,
  listQuerySchema,
  createLedgerSchema,
  updateLedgerSchema,
} from './ledger.service';

export const ledgerRouter: Router = Router();
ledgerRouter.use(requireAuth);

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

ledgerRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);
    await ensureAccess(req.user!.sub, q.companyId);
    const { ledgers, total } = await listLedgers(q.companyId, q);
    return ok(res, { ledgers, total, page: q.page, pageSize: q.pageSize });
  }),
);

ledgerRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.query as { companyId: string };
    await ensureAccess(req.user!.sub, companyId);
    const ledger = await getLedger(companyId, id);
    return ok(res, ledger);
  }),
);

ledgerRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    const data = createLedgerSchema.parse(req.body);
    await ensureAccess(req.user!.sub, companyId);
    const ledger = await createLedger(req.user!.sub, companyId, data, req);
    return created(res, ledger);
  }),
);

ledgerRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.query as { companyId: string };
    const data = updateLedgerSchema.parse(req.body);
    await ensureAccess(req.user!.sub, companyId);
    const ledger = await updateLedger(req.user!.sub, companyId, id, data, req);
    return ok(res, ledger);
  }),
);

ledgerRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.query as { companyId: string };
    await ensureAccess(req.user!.sub, companyId);
    await deleteLedger(req.user!.sub, companyId, id, req);
    return res.status(204).send();
  }),
);
