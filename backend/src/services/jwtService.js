import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { HttpError } from "../lib/httpError.js";

export const jwtService = {
  signAuthToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        wallet: user.wallet,
        wallet_provider: user.wallet_provider,
      },
      env.authJwtSecret,
      { expiresIn: env.authTokenTtl }
    );
  },

  verifyAuthToken(token) {
    try {
      return jwt.verify(token, env.authJwtSecret);
    } catch {
      throw new HttpError(401, "Invalid or expired auth token");
    }
  },
};
