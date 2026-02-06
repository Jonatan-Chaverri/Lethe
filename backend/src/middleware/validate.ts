import type { NextFunction, Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";
import { z, type ZodObject, type ZodTypeAny } from "zod";

const requestValidationSchema = z.object({
  body: z.unknown(),
  query: z.record(z.any()),
  params: z.record(z.any()),
});

/**
 * Validation middleware factory.
 * Validates request body, query, and params against a Zod schema.
 */
export function validate(schema: ZodObject<Record<string, ZodTypeAny>>) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const envelope = requestValidationSchema.parse({
        body: req.body,
        query: req.query ?? {},
        params: req.params ?? {},
      });

      const parsed = await schema.parseAsync(envelope);

      req.body = parsed.body;
      req.query = parsed.query as ParsedQs;
      req.params = parsed.params as ParamsDictionary;

      next();
    } catch (error) {
      next(error);
    }
  };
}
