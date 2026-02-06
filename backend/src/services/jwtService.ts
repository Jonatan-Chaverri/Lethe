import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../lib/env";
import { HttpError } from "../lib/httpError";
import type { UserDto } from "../types/auth";

interface AuthTokenPayload extends JwtPayload {
  sub: string;
  wallet: string;
  wallet_provider: string;
}

export const jwtService = {
  signAuthToken(user: UserDto): string {
    return jwt.sign(
      {
        sub: user.id,
        wallet: user.wallet,
        wallet_provider: user.wallet_provider,
      },
      env.authJwtSecret,
      { expiresIn: env.authTokenTtl } as SignOptions
    );
  },

  verifyAuthToken(token: string): AuthTokenPayload {
    try {
      const payload = jwt.verify(token, env.authJwtSecret);

      if (!payload || typeof payload === "string") {
        throw new HttpError(401, "Invalid auth token payload");
      }

      if (typeof payload.sub !== "string") {
        throw new HttpError(401, "Invalid auth token subject");
      }

      return payload as AuthTokenPayload;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(401, "Invalid or expired auth token");
    }
  },
};
