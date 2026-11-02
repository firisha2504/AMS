import { Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';

export async function auditLog(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const originalJson = res.json.bind(res);

  res.json = function (body: unknown) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const userId = (req as { user?: { userId: string } }).user?.userId;
      const action = `${req.method} ${req.originalUrl}`;

      prisma.auditLog
        .create({
          data: {
            userId,
            action,
            module: req.baseUrl.replace('/api/', '') || 'system',
            details: {
              method: req.method,
              path: req.originalUrl,
              body: sanitizeBody(req.body),
            } as Prisma.InputJsonValue,
            ipAddress: req.ip || req.socket.remoteAddress,
          },
        })
        .catch(() => {});
    }

    return originalJson(body);
  };

  next();
}

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...(body as Record<string, unknown>) };
  if ('password' in sanitized) sanitized.password = '[REDACTED]';
  if ('passwordHash' in sanitized) sanitized.passwordHash = '[REDACTED]';
  return sanitized;
}

export async function createAuditEntry(
  userId: string | null,
  action: string,
  module: string,
  details?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      module,
      details: details as Prisma.InputJsonValue | undefined,
      ipAddress,
    },
  });
}
