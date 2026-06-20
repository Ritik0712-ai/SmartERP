// SmartERP shared Zod schemas + TS types
// This is the single source of truth for request/response shapes.

import { z } from 'zod';

// ====== Common helpers ======
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email().toLowerCase().trim();
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long');
export const nameSchema = z.string().min(1).max(255).trim();
export const positiveAmountSchema = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
  .pipe(z.number().nonnegative('Amount must be non-negative'));
export const decimalSchema = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
  .pipe(z.number());

// ====== Pagination ======
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type Pagination = z.infer<typeof paginationSchema>;

// ====== Auth (Day 2) ======
export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

// ====== Company (Day 3) ======
export const createCompanySchema = z.object({
  name: nameSchema,
  address: z.string().max(1000).optional(),
  contactNumber: z.string().max(20).optional(),
  email: emailSchema.optional().or(z.literal('')),
  gstNumber: z.string().max(50).optional(),
  panNumber: z.string().max(20).optional(),
  state: z.string().max(100).optional(),
  stateCode: z.string().max(10).optional(),
  financialYearStart: z.coerce.date(),
  financialYearEnd: z.coerce.date(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).default('INR'),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = createCompanySchema.partial();
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

// ====== Ledger (Day 5) ======
export const createLedgerSchema = z.object({
  ledgerGroupId: uuidSchema,
  name: nameSchema,
  openingBalance: decimalSchema.default(0),
  description: z.string().max(1000).optional(),
});
export type CreateLedgerInput = z.infer<typeof createLedgerSchema>;

// ====== Voucher (Day 7+) ======
export const voucherEntrySchema = z.object({
  ledgerId: uuidSchema,
  entryType: z.enum(['DEBIT', 'CREDIT']),
  amount: positiveAmountSchema,
  narration: z.string().max(500).optional(),
});
export type VoucherEntryInput = z.infer<typeof voucherEntrySchema>;

// ====== Re-exports ======
export * from './constants';
