import { prisma } from '../../config/prisma';
import { registerSchema, loginSchema, refreshSchema } from '@smarterp/shared';
import { hashPassword, verifyPassword, signAccessToken, generateRefreshToken, hashRefreshToken } from '../../utils/jwt';
import { writeAudit } from '../../utils/audit';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../../middleware/errorHandler';
import { UserRole, Currency } from '@prisma/client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export interface AuthResult {
  user: {
    id: string;
    name: string;
    email: string;
  };
  tokens: AuthTokens;
  companies: Array<{
    id: string;
    name: string;
    role: UserRole;
  }>;
}

const DEFAULT_LEDGER_GROUPS: Array<{ name: string; groupType: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'; parent?: string }> = [
  { name: 'Assets', groupType: 'ASSET' },
  { name: 'Liabilities', groupType: 'LIABILITY' },
  { name: 'Income', groupType: 'INCOME' },
  { name: 'Expenses', groupType: 'EXPENSE' },
  { name: 'Capital', groupType: 'LIABILITY' },
  { name: 'Sundry Debtors', groupType: 'ASSET', parent: 'Assets' },
  { name: 'Sundry Creditors', groupType: 'LIABILITY', parent: 'Liabilities' },
  { name: 'Sales Account', groupType: 'INCOME', parent: 'Income' },
  { name: 'Purchase Account', groupType: 'EXPENSE', parent: 'Expenses' },
  { name: 'Cash', groupType: 'ASSET', parent: 'Assets' },
  { name: 'Bank', groupType: 'ASSET', parent: 'Assets' },
  { name: 'Duties & Taxes', groupType: 'LIABILITY', parent: 'Liabilities' },
];

const DEFAULT_UNITS = [
  { name: 'PCS', symbol: 'pcs', decimals: 0 },
  { name: 'KG', symbol: 'kg', decimals: 3 },
  { name: 'LTR', symbol: 'L', decimals: 2 },
  { name: 'BOX', symbol: 'box', decimals: 0 },
  { name: 'MTR', symbol: 'm', decimals: 2 },
  { name: 'DOZ', symbol: 'dz', decimals: 0 },
];

/**
 * Run the heavy bootstrap (ledger groups, units, system ledgers) in the background.
 * Returns immediately. Used after the fast register response.
 */
async function runBackgroundBootstrap(companyId: string): Promise<void> {
  try {
    console.log(`[bootstrap] starting for company ${companyId}`);
    const groupIdMap = new Map<string, string>();
    for (const g of DEFAULT_LEDGER_GROUPS) {
      const created = await prisma.ledgerGroup.create({
        data: {
          companyId,
          name: g.name,
          groupType: g.groupType,
          parentGroupId: g.parent ? groupIdMap.get(g.parent) : null,
        },
      });
      groupIdMap.set(g.name, created.id);
    }
    for (const u of DEFAULT_UNITS) {
      await prisma.unit.create({ data: { ...u, companyId } });
    }
    await prisma.stockGroup.create({ data: { companyId, name: 'General' } });
    await prisma.ledger.createMany({
      data: [
        { companyId, ledgerGroupId: groupIdMap.get('Cash')!, name: 'Cash in Hand', isSystem: true },
        { companyId, ledgerGroupId: groupIdMap.get('Bank')!, name: 'Bank', isSystem: true },
        { companyId, ledgerGroupId: groupIdMap.get('Sales Account')!, name: 'Sales', isSystem: true },
        { companyId, ledgerGroupId: groupIdMap.get('Purchase Account')!, name: 'Purchase', isSystem: true },
      ],
    });
    console.log(`[bootstrap] done for company ${companyId}`);
  } catch (err) {
    console.error(`[bootstrap] failed for company ${companyId}:`, err);
  }
}

/**
 * FAST register: creates user + company + role + financial year in ~1-2s,
 * then kicks off the heavy bootstrap (ledger groups, units, system ledgers) in the background.
 * The user gets logged in immediately; the bootstrap finishes ~30-60s later.
 */
export async function registerUser(input: unknown, meta: { ip: string; userAgent: string }) {
  const data = registerSchema.parse(input);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ConflictError('Email already registered');

  const passwordHash = await hashPassword(data.password);
  const fyStart = new Date(new Date().getFullYear(), 3, 1);
  const fyEnd = new Date(fyStart);
  fyEnd.setFullYear(fyStart.getFullYear() + 1);
  fyEnd.setDate(fyEnd.getDate() - 1);

  const body = (input && typeof input === 'object' ? (input as Record<string, unknown>) : {}) as Record<string, unknown>;
  const defaultCompanyName = `${data.name.split(' ')[0]}'s Company`;
  const companyName = (body.companyName as string) || defaultCompanyName;

  // Fast path: 4 inserts that finish in 1-2 seconds
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      isActive: true,
      emailVerified: true,
    },
  });
  const company = await prisma.company.create({
    data: {
      name: companyName,
      address: body.address as string | undefined,
      contactNumber: body.contactNumber as string | undefined,
      email: body.companyEmail as string | undefined,
      gstNumber: body.gstNumber as string | undefined,
      state: body.state as string | undefined,
      stateCode: body.stateCode as string | undefined,
      currency: (body.currency as Currency) ?? Currency.INR,
      financialYearStart: fyStart,
      financialYearEnd: fyEnd,
      createdById: user.id,
    },
  });
  await prisma.userCompanyRole.create({
    data: { userId: user.id, companyId: company.id, role: UserRole.ADMIN },
  });
  await prisma.financialYear.create({
    data: {
      companyId: company.id,
      yearName: `${fyStart.getFullYear()}-${(fyStart.getFullYear() + 1).toString().slice(-2)}`,
      startDate: fyStart,
      endDate: fyEnd,
      isCurrent: true,
    },
  });

  // Issue tokens immediately
  const tokens = await issueTokens(user.id, user.email, meta);

  await writeAudit({
    userId: user.id,
    companyId: company.id,
    module: 'auth',
    entityType: 'user',
    entityId: user.id,
    action: 'CREATE',
    description: `User ${user.email} registered with company ${company.name}`,
  });

  // Kick off the heavy bootstrap in the background — don't block the response
  setImmediate(() => {
    void runBackgroundBootstrap(company.id);
  });

  return {
    user: { id: user.id, name: user.name, email: user.email },
    tokens,
    companies: [{ id: company.id, name: company.name, role: UserRole.ADMIN }],
  };
}

export async function loginUser(input: unknown, meta: { ip: string; userAgent: string }) {
  const data = loginSchema.parse(input);
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: {
      companyRoles: {
        where: { isActive: true },
        include: { company: { select: { id: true, name: true, isActive: true } } },
      },
    },
  });
  if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials');
  const ok = await verifyPassword(data.password, user.passwordHash);
  if (!ok) throw new UnauthorizedError('Invalid credentials');

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  const tokens = await issueTokens(user.id, user.email, meta);

  await writeAudit({
    userId: user.id,
    module: 'auth',
    entityType: 'user',
    entityId: user.id,
    action: 'LOGIN',
    description: `User ${user.email} logged in`,
  });

  return {
    user: { id: user.id, name: user.name, email: user.email },
    tokens,
    companies: user.companyRoles
      .filter((r) => r.company.isActive)
      .map((r) => ({ id: r.company.id, name: r.company.name, role: r.role })),
  };
}

export async function refreshTokens(input: unknown, meta: { ip: string; userAgent: string }) {
  const { refreshToken } = refreshSchema.parse(input);
  const tokenHash = hashRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
  const newTokens = await issueTokens(stored.userId, stored.user.email, meta);
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true, revokedAt: new Date() },
  });
  return { tokens: newTokens };
}

export async function logoutUser(userId: string, refreshToken: string | undefined) {
  if (refreshToken) {
    const tokenHash = hashRefreshToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, userId, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
  } else {
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
  }
  await writeAudit({
    userId,
    module: 'auth',
    entityType: 'user',
    entityId: userId,
    action: 'LOGOUT',
    description: 'User logged out',
  });
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      companyRoles: {
        where: { isActive: true },
        include: { company: { select: { id: true, name: true, isActive: true } } },
      },
    },
  });
  if (!user) throw new NotFoundError('User not found');
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    companies: user.companyRoles
      .filter((r) => r.company.isActive)
      .map((r) => ({ id: r.company.id, name: r.company.name, role: r.role })),
  };
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');
  const ok = await verifyPassword(oldPassword, user.passwordHash);
  if (!ok) throw new UnauthorizedError('Current password is incorrect');
  if (newPassword.length < 8) throw new BadRequestError('New password must be at least 8 characters');
  const newHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true, revokedAt: new Date() },
  });
  await writeAudit({
    userId,
    module: 'auth',
    entityType: 'user',
    entityId: userId,
    action: 'UPDATE',
    description: 'Password changed; all sessions revoked',
  });
}

async function issueTokens(userId: string, email: string, meta: { ip: string; userAgent: string }) {
  const accessToken = signAccessToken({ userId, email });
  const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: meta.userAgent.slice(0, 500),
      ipAddress: meta.ip,
    },
  });
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
  };
}
