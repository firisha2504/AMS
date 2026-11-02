/**
 * Common route operations to reduce code duplication
 */

import { Response } from 'express';
import prisma from '../config/database.js';
import { AuthRequest } from './auth.js';
import { sendError } from '../utils/response.js';

/**
 * Get member by ID with error handling
 */
export async function getMemberById(
  memberId: string,
  lang: 'om' | 'en' = 'om'
): Promise<{ member: any; error: boolean; response?: any }> {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) {
    return { member: null, error: true };
  }
  return { member, error: false };
}

/**
 * Get member by user ID with error handling
 */
export async function getMemberByUserId(
  userId: string,
  lang: 'om' | 'en' = 'om'
): Promise<{ member: any; error: boolean }> {
  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) {
    return { member: null, error: true };
  }
  return { member, error: false };
}

/**
 * Send member not found error and return true if missing
 */
export function handleMemberNotFound(
  res: Response,
  memberId: string | null | undefined,
  lang: 'om' | 'en' = 'om'
): boolean {
  if (!memberId) {
    sendError(res, 'member.notFound', lang, 404);
    return true;
  }
  return false;
}

/**
 * Get pagination params from query with defaults
 */
export function getPaginationParams(query: any): { page: number; limit: number } {
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 20;
  return { page: Math.max(1, page), limit: Math.max(1, Math.min(100, limit)) };
}

/**
 * Get language from request with default
 */
export function getLanguage(req: AuthRequest): 'om' | 'en' {
  const lang = req.lang as ('om' | 'en' | undefined);
  return lang === 'en' ? 'en' : 'om';
}

/**
 * Extract string param safely
 */
export function getStringParam(param: any): string {
  return String(param || '');
}
