import { logger } from "../lib/logger.js";

export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    logger.info("Request completed: method: " + req.method + ", path: " + req.originalUrl + ", status: " + res.statusCode + ", duration: " + durationMs + "ms");
  });

  next();
}
