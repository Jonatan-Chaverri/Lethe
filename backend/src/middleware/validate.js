import { z } from "zod";

const requestValidationSchema = z.object({
  body: z.unknown(),
  query: z.record(z.any()),
  params: z.record(z.any()),
});

/**
 * Validation middleware factory.
 * Validates request body/query/params using a zod object schema.
 */
export function validate(schema) {
  return async (req, _res, next) => {
    try {
      const parsedEnvelope = requestValidationSchema.parse({
        body: req.body,
        query: req.query ?? {},
        params: req.params ?? {},
      });

      const parsed = await schema.parseAsync(parsedEnvelope);

      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;

      next();
    } catch (error) {
      next(error);
    }
  };
}

