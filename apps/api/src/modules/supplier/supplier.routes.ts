import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ok, created } from '../../middleware/response';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../config/prisma';
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  listQuerySchema,
  createSupplierSchema,
  updateSupplierSchema,
} from './supplier.service';

export const supplierRouter: Router = Router();
supplierRouter.use(requireAuth);

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

supplierRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);
    await ensureAccess(req.user!.sub, q.companyId);
    const { suppliers, total } = await listSuppliers(q.companyId, q);
    return ok(res, { suppliers, total, page: q.page, pageSize: q.pageSize });
  }),
);

supplierRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.query as { companyId: string };
    await ensureAccess(req.user!.sub, companyId);
    const supplier = await getSupplier(companyId, id);
    return ok(res, supplier);
  }),
);

supplierRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    const data = createSupplierSchema.parse(req.body);
    await ensureAccess(req.user!.sub, companyId);
    const supplier = await createSupplier(req.user!.sub, companyId, data, req);
    return created(res, supplier);
  }),
);

supplierRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.query as { companyId: string };
    const data = updateSupplierSchema.parse(req.body);
    await ensureAccess(req.user!.sub, companyId);
    const supplier = await updateSupplier(req.user!.sub, companyId, id, data, req);
    return ok(res, supplier);
  }),
);

supplierRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.query as { companyId: string };
    await ensureAccess(req.user!.sub, companyId);
    await deleteSupplier(req.user!.sub, companyId, id, req);
    return res.status(204).send();
  }),
);
