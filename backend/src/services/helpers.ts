import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '@prisma/client';
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import { AuthPayload } from '../middleware/auth.js';

/**
 * Replace `{key}` placeholders in a template string with values from `vars`.
 * Unrecognised placeholders are left unchanged.
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match
  );
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateMemberId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `AF${year}${random}`;
}

export function generatePaymentId(): string {
  return `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function generateReceiptNumber(): string {
  return `RCP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function generateTransactionId(): string {
  return `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export async function createRefreshToken(userId: string): Promise<string> {
  const token = signRefreshToken(userId);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
}

export async function getSetting(key: string, fallback: string): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  return setting?.value ?? fallback;
}

export async function getNumericSetting(key: string, fallback: number): Promise<number> {
  const value = await getSetting(key, String(fallback));
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

export async function incrementFailedLogin(userId: string): Promise<void> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: { increment: 1 } },
  });

  if (user.failedLoginAttempts >= config.lockout.maxAttempts) {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + config.lockout.durationMinutes);
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil },
    });
  }
}

export async function resetFailedLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
}

export function getWeekNumber(date: Date): number {
  // ISO 8601 week numbering
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Calculate week number relative to group start date
 * Week 1 = first week of group, Week 2 = second week, etc.
 * This is more intuitive for savings groups than ISO week numbering
 */
export async function getGroupRelativeWeekNumber(date: Date): Promise<number> {
  const prisma = (await import('../config/database.js')).default;
  
  // Get group start date from system settings
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'group_start_date' },
  });

  let groupStartDate: Date;
  if (!setting || !setting.value) {
    // Default to 1 year ago if not set
    groupStartDate = new Date();
    groupStartDate.setFullYear(groupStartDate.getFullYear() - 1);
  } else {
    groupStartDate = new Date(setting.value);
  }

  // Calculate weeks between group start and given date
  const timeDiff = date.getTime() - groupStartDate.getTime();
  const weeksDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7));
  
  // Week 1 is the first week (0-6 days = week 1, 7-13 days = week 2, etc.)
  return weeksDiff + 1;
}

export function getNextSaturday(from: Date = new Date()): Date {
  const date = new Date(from);
  const day = date.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function ensureAuditorOrAdminExists(
  role: UserRole,
  username: string,
  phone: string,
  email: string,
  password: string,
  fullName: string
) {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: {
      username,
      phone,
      email,
      passwordHash,
      role,
      isActive: true,
      isVerified: true,
    },
  });
}

export { uuidv4 };
