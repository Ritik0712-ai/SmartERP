import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { listVouchers, getVoucher, createVoucher, cancelVoucher, listVouchersSchema, idParamSchema } from './voucher.service';
import { errorHandler } from '../../middleware/errorHandler';
import { z } from 'zod';

export const voucherRouter = Router();

function handleError(err: unknown, req: Request, res: Response) {
  errorHandler(err as Error, req, res, () => {});
}

// GET /vouchers — list with filters
voucherRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = listVouchersSchema.parse({
      ...req.query,
      companyId: req.query.companyId,
    });
    const result = await listVouchers(query);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, req, res);
  }
});

// GET /vouchers/:id
voucherRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const companyId = req.query.companyId as string;
    if (!companyId) throw new Error('companyId query param required');
    const voucher = await getVoucher(companyId, id);
    res.json({ success: true, data: voucher });
  } catch (err) {
    handleError(err, req, res);
  }
});

// POST /vouchers — create
voucherRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub as string;
    const companyId = req.query.companyId as string;
    if (!companyId) throw new Error('companyId query param required');
    const voucher = await createVoucher(userId, companyId, req.body, req);
    res.status(201).json({ success: true, data: voucher });
  } catch (err) {
    handleError(err, req, res);
  }
});

// DELETE /vouchers/:id — cancel
voucherRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub as string;
    const companyId = req.query.companyId as string;
    if (!companyId) throw new Error('companyId query required');
    const { id } = idParamSchema.parse(req.params);
    const body = z.object({ reason: z.string().min(1) }).safeParse(req.body ?? {});
    const reason = body.success ? body.data.reason : 'No reason provided';
    const result = await cancelVoucher(userId, companyId, id, reason, req);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, req, res);
  }
});
