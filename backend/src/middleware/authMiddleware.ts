import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/httpError";
import { authService } from "../services/authService";
import { jwtService } from "../services/jwtService";
import { logger } from "@/lib/logger";

function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw new HttpError(401, "Missing bearer token");
    }

    const payload = jwtService.verifyAccessToken(token);
    const user = await authService.getUserById(payload.sub);

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
