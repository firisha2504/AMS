import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { sendError, getLanguage } from '../utils/response.js';
import { AuthRequest } from './auth.js';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const lang = getLanguage(req.headers['accept-language'] as string);

    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        error.errors.forEach((e) => {
          const path = e.path.join('.');
          if (!errors[path]) errors[path] = [];
          errors[path].push(e.message);
        });
        sendError(res, 'general.validationError', lang, 422, errors);
        return;
      }
      next(error);
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const lang = getLanguage(req.headers['accept-language'] as string);

    try {
      req.validatedQuery = schema.parse(req.query) as Record<string, unknown>;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        error.errors.forEach((e) => {
          const path = e.path.join('.');
          if (!errors[path]) errors[path] = [];
          errors[path].push(e.message);
        });
        sendError(res, 'general.validationError', lang, 422, errors);
        return;
      }
      next(error);
    }
  };
}