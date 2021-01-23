import type { Request, Response, NextFunction } from 'express';
import type { ValidationError } from 'express-openapi-validator/dist/framework/types';

export default function errorHandler(
  err: Error | HttpError | ValidationError,
  _: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) return next(err);
  const errorCode = res['sentry'] || null;
  const errors = (err as ValidationError).errors || [{ message: err.message }];
  res.status((err as ValidationError | HttpError).status || 500).json({ errors, errorCode });
  return undefined;
}

export function wrapAsync(fn: (req: Request, res: Response, next?: NextFunction) => Promise<void>) {
  // Make sure to `.catch()` any errors and pass them along to the `next()`
  // middleware in the chain, in this case the error handler.
  return (req: Request, res: Response, next: NextFunction): Promise<void> =>
    fn(req, res, next).catch(next);
}

export class HttpError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}
