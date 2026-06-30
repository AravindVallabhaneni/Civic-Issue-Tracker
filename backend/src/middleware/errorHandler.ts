import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export class HttpError extends Error implements AppError {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId;

  if (err instanceof ZodError) {
    logger.warn({ requestId, errors: err.flatten() }, 'Validation error');
    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      requestId,
    });
    return;
  }

  if (err instanceof HttpError) {
    logger.warn({ requestId, statusCode: err.statusCode, message: err.message }, 'HTTP error');
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code || 'HTTP_ERROR',
      requestId,
    });
    return;
  }

  // Unexpected error
  logger.error({ requestId, err }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId,
  });
}
