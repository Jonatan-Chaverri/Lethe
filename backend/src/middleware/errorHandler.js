import { HttpError } from "../lib/httpError.js";
import { logger } from "../lib/logger.js";
import { ZodError } from "zod";

export function notFoundHandler(req, _res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    const details = error.flatten();

    logger.warn("validation_failed", { details });

    return res.status(400).json({
      message: "Validation failed",
      details,
    });
  }

  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof HttpError ? error.message : "Internal server error";

  logger.error("request_failed", {
    status,
    message,
    details: error?.details,
    stack: error?.stack,
  });

  const body = { message };

  if (error instanceof HttpError && error.details) {
    body.details = error.details;
  }

  res.status(status).json(body);
}
