import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { config } from '../config/index.js';
import prisma from '../config/database.js';
import { sendError, getLanguage } from '../utils/response.js';

export interface AuthPayload {
  userId: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
  lang?: 'en' | 'om';
  validatedQuery?: Record<string, unknown>;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const lang = getLanguage(req.headers['accept-language'] as string);
  req.lang = lang;

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'auth.unauthorized', lang, 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true, lockedUntil: true },
    });

    if (!user || !user.isActive) {
      sendError(res, 'auth.accountInactive', lang, 401);
      return;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      sendError(res, 'auth.accountLocked', lang, 403);
      return;
    }

    req.user = { userId: user.id, role: user.role };
    next();
  } catch {
    sendError(res, 'auth.tokenExpired', lang, 401);
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const lang = req.lang || 'om';

    if (!req.user) {
      sendError(res, 'auth.unauthorized', lang, 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'auth.forbidden', lang, 403);
      return;
    }

    next();
  };
}

export function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  req.lang = getLanguage(req.headers['accept-language'] as string);
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;
      req.user = decoded;
    } catch {
      // Token invalid — continue without auth
    }
  }

  next();
}
