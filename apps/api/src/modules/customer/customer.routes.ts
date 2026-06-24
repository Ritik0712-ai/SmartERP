import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ok, created } from '../../middleware/response';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../config/prisma';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listQuerySchema,
  createCustomerSchema,
  updateCustomerSchema,
} from './customer.service';

export const customerRouter: Router = Router();
customerRouter.use(requireAuth);

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

customerRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);
    await ensureAccess(req.user!.sub, q.companyId);
    const { customers, total } = await listCustomers(q.companyId, q);
    return ok(res, { customers, total, page: q.page, pageSize: q.pageSize });
  }),
);

customerRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.query as { companyId: string };
    await ensureAccess(req.user!.sub, companyId);
    const customer = await getCustomer(companyId, id);
    return ok(res, customer);
  }),
);

customerRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { companyId } = req.query as { companyId: string };
    const data = createCustomerSchema.parse(req.body);
    await ensureAccess(req.user!.sub, companyId);
    const customer = await createCustomer(req.user!.sub, companyId, data, req);
    return created(res, customer);
  }),
);

customerRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.query as { companyId: string };
    const data = updateCustomerSchema.parse(req.body);
    await ensureAccess(req.user!.sub, companyId);
    const customer = await updateCustomer(req.user!.sub, companyId, id, data, req);
    return ok(res, customer);
  }),
);

customerRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.query as { companyId: string };
    await ensureAccess(req.user!.sub, companyId);
    await deleteCustomer(req.user!.sub, companyId, id, req);
    return res.status(204).send();
  }),
);
