import { NextFunction, Request, RequestHandler } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '@/utils/ApiError';

type Source = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodSchema, source: Source = 'body'): RequestHandler =>
  (req: Request, _res, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const flat = result.error.flatten();
      return next(
        ApiError.badRequest('Validation failed', {
          fieldErrors: flat.fieldErrors,
          formErrors: flat.formErrors,
        }),
      );
    }
    // assign parsed (coerced) data back
    if (source === 'body') req.body = result.data;
    else if (source === 'query') (req as unknown as { validatedQuery: unknown }).validatedQuery = result.data;
    else (req as unknown as { validatedParams: unknown }).validatedParams = result.data;

    next();
  };

/** Helper to get validated query/params safely inside controllers. */
export const getValidated = <T>(req: Request, source: 'query' | 'params'): T => {
  const key = source === 'query' ? 'validatedQuery' : 'validatedParams';
  return (req as unknown as Record<string, T>)[key];
};
