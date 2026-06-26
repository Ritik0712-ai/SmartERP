import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ok, created } from '../../middleware/response';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../config/prisma';
import {
  listStockItems,
  getStockItem,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  createStockItemSchema,
  updateStockItemSchema,
  listQuerySchema,
} from './stock-item.service';

export const stockItemRouter: Router = Router();
stockItemRouter.use(requireAuth);

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

stockItemRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);
    await ensureAccess(req.user!.sub, q.companyId);
    const { items, total } = await listStockItems(q.companyId, q);
    return ok(res, { items, total, page: q.page, pageSize: q.pageSize });
  }),
);

stockItemRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    await ensureAccess(req.user!.sub, companyId);
    const item = await getStockItem(companyId, req.params.id);
    return ok(res, item);
  }),
);

stockItemRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    const data = createStockItemSchema.parse(req.body);
    await ensureAccess(req.user!.sub, companyId);
    const item = await createStockItem(req.user!.sub, companyId, data, req);
    return created(res, item);
  }),
);

stockItemRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    const data = updateStockItemSchema.parse(req.body);
    await ensureAccess(req.user!.sub, companyId);
    const item = await updateStockItem(req.user!.sub, companyId, req.params.id, data, req);
    return ok(res, item);
  }),
);

stockItemRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    await ensureAccess(req.user!.sub, companyId);
    await deleteStockItem(req.user!.sub, companyId, req.params.id, req);
    return res.status(204).send();
  }),
);
