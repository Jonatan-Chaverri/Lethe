import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = res.getHeader("X-Request-ID");

  if (req.originalUrl === "/api/health") {
    next();
    return;
  }

  logger.info(
    {
      method: req.method,
      path: req.originalUrl,
      requestId,
    },
    "request_started"
  );

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    logger.info(
      {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        requestId,
      },
      "request_completed"
    );
  });

  next();
}
