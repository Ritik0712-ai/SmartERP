import { prisma } from '../../config/prisma';
import { generateRefreshToken, hashPassword, signAccessToken } from '../../utils/jwt';
import { writeAudit } from '../../utils/audit';
import { UserRole, Currency } from '@prisma/client';
import { z } from 'zod';

export const googleAuthSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  avatarUrl: z.string().url().nullable().optional(),
  supabaseUserId: z.string().min(1),
  mode: z.enum(['login', 'register']).default('login'),
  companyName: z.string().min(1).max(255).optional(),
});
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

async function buildUserResponse(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      companyRoles: {
        where: { isActive: true },
        include: { company: { select: { id: true, name: true, isActive: true } } },
      },
    },
  });
  if (!user) return null;
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

async function createDefaultCompany(userId: string, name: string) {
  const fyStart = new Date(new Date().getFullYear(), 3, 1);
  const fyEnd = new Date(fyStart);
  fyEnd.setFullYear(fyStart.getFullYear() + 1);
  fyEnd.setDate(fyEnd.getDate() - 1);

  const company = await prisma.company.create({
    data: {
      name,
      currency: Currency.INR,
      financialYearStart: fyStart,
      financialYearEnd: fyEnd,
      createdById: userId,
    },
  });
  await prisma.userCompanyRole.create({
    data: { userId, companyId: company.id, role: UserRole.ADMIN },
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
  return company;
}

export async function googleAuth(input: unknown, meta: { ip: string; userAgent: string }) {
  const data = googleAuthSchema.parse(input);
  const email = data.email.toLowerCase().trim();

  let user = await prisma.user.findUnique({ where: { email } });
  let isNewUser = false;
  let companyId: string | null = null;

  if (!user) {
    isNewUser = true;
    const randomPassword = `google-oauth-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const passwordHash = await hashPassword(randomPassword);
    user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        passwordHash,
        isActive: true,
        emailVerified: true,
        avatarUrl: data.avatarUrl ?? null,
        lastLogin: new Date(),
      },
    });
    const companyName = data.companyName || `${data.name.split(' ')[0]}'s Company`;
    const company = await createDefaultCompany(user.id, companyName);
    companyId = company.id;
    await writeAudit({
      userId: user.id,
      companyId: company.id,
      module: 'auth',
      entityType: 'user',
      entityId: user.id,
      action: 'CREATE',
      description: `User ${email} signed up via Google`,
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: data.avatarUrl ?? user.avatarUrl,
        lastLogin: new Date(),
      },
    });
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refresh = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
      userAgent: meta.userAgent.slice(0, 500),
      ipAddress: meta.ip,
    },
  });

  await writeAudit({
    userId: user.id,
    companyId: companyId,
    module: 'auth',
    entityType: 'user',
    entityId: user.id,
    action: 'LOGIN',
    description: `User ${user.email} signed in via Google (new: ${isNewUser})`,
  });

  const userJson = await buildUserResponse(user.id);
  if (!userJson) throw new Error('User disappeared after auth');

  return {
    user: userJson,
    tokens: {
      accessToken,
      refreshToken: refresh.token,
      accessTokenExpiresIn: '15m',
      refreshTokenExpiresIn: '7d',
    },
    companies: userJson.companies,
  };
}
