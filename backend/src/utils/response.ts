import { Response } from 'express';
import { Language, t } from './i18n.js';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  meta?: Record<string, unknown>;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  messageKey = 'general.success',
  lang: Language = 'om',
  statusCode = 200,
  meta?: Record<string, unknown>
): void {
  const response: ApiResponse<T> = {
    success: true,
    message: t(lang, messageKey),
    data,
  };
  if (meta) response.meta = meta;
  res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  messageKey: string,
  lang: Language = 'om',
  statusCode = 400,
  errors?: Record<string, string[]>
): void {
  const response: ApiResponse = {
    success: false,
    message: t(lang, messageKey),
  };
  if (errors) response.errors = errors;
  res.status(statusCode).json(response);
}

export function getLanguage(header?: string): Language {
  if (header === 'en' || header === 'om') return header;
  return 'om';
}
