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
  signAccessToken(user: UserDto): string {
    return jwt.sign(
      {
        sub: user.id,
        wallet: user.wallet,
        wallet_provider: user.wallet_provider,
        typ: "access",
      },
      env.authAccessJwtSecret,
      { expiresIn: env.authAccessTokenTtl } as SignOptions
    );
  },

  signRefreshToken(user: UserDto): string {
    return jwt.sign(
      {
        sub: user.id,
        wallet: user.wallet,
        wallet_provider: user.wallet_provider,
        typ: "refresh",
      },
      env.authRefreshJwtSecret,
      { expiresIn: env.authRefreshTokenTtl } as SignOptions
    );
  },

  verifyAccessToken(token: string): AuthTokenPayload {
    try {
      const payload = jwt.verify(token, env.authAccessJwtSecret);

      if (!payload || typeof payload === "string") {
        throw new HttpError(401, "Invalid auth token payload");
      }

      if (typeof payload.sub !== "string") {
        throw new HttpError(401, "Invalid auth token subject");
      }

      if ((payload as JwtPayload).typ !== "access") {
        throw new HttpError(401, "Invalid access token type");
      }

      return payload as AuthTokenPayload;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(401, "Invalid or expired auth token");
    }
  },

  verifyRefreshToken(token: string): AuthTokenPayload {
    try {
      const payload = jwt.verify(token, env.authRefreshJwtSecret);

      if (!payload || typeof payload === "string") {
        throw new HttpError(401, "Invalid refresh token payload");
      }

      if (typeof payload.sub !== "string") {
        throw new HttpError(401, "Invalid refresh token subject");
      }

      if ((payload as JwtPayload).typ !== "refresh") {
        throw new HttpError(401, "Invalid refresh token type");
      }

      return payload as AuthTokenPayload;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(401, "Invalid or expired refresh token");
    }
  },

  getRefreshTokenExpiry(token: string): Date {
    const payload = this.verifyRefreshToken(token);

    if (typeof payload.exp !== "number") {
      throw new HttpError(401, "Refresh token has no expiry");
    }

    return new Date(payload.exp * 1000);
  },
};
