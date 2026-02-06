import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/httpError";
import { logger } from "../lib/logger";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    const details = error.flatten();

    logger.warn({ details }, "validation_failed");

    return res.status(400).json({
      message: "Validation failed",
      details,
    });
  }

  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof HttpError ? error.message : "Internal server error";

  logger.error(
    {
      status,
      message,
      details: error instanceof HttpError ? error.details : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    },
    "request_failed"
  );

  const body: { message: string; details?: unknown } = { message };

  if (error instanceof HttpError && error.details) {
    body.details = error.details;
  }

  res.status(status).json(body);
};
