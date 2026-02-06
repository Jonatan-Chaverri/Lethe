import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = randomUUID();

  (req as any).requestId = id;
  res.setHeader("X-Request-ID", id);

  next();
}
