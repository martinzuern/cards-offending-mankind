import { Request, Response, NextFunction } from 'express';

// eslint-disable-next-line no-unused-vars, no-shadow
export default function errorHandler(err, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    return next(err);
  }
  const errors = err.errors || [{ message: err.message }];
  res.status(err.status || 500).json({ errors });
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
