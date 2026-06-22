import { prisma } from '../config/prisma';
import { AuditAction, Prisma } from '@prisma/client';
import { Request } from 'express';

export interface AuditContext {
  userId: string;
  companyId?: string | null;
  module: string;
  entityType: string;
  entityId?: string | null;
  action: AuditAction;
  description?: string;
  oldValue?: Prisma.JsonValue;
  newValue?: Prisma.JsonValue;
}

export async function writeAudit(ctx: AuditContext, req?: Request): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        companyId: ctx.companyId ?? null,
        module: ctx.module,
        entityType: ctx.entityType,
        entityId: ctx.entityId ?? null,
        action: ctx.action,
        description: ctx.description,
        oldValue: ctx.oldValue as Prisma.InputJsonValue | undefined,
        newValue: ctx.newValue as Prisma.InputJsonValue | undefined,
        ipAddress: req?.ip ?? req?.headers['x-forwarded-for']?.toString() ?? null,
        userAgent: req?.headers['user-agent']?.toString() ?? null,
      },
    });
  } catch (err) {
    // Audit failures should never break the main flow — log only
    console.error('Audit log write failed:', err);
  }
}
