import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: required("DATABASE_URL"),
  starknetRpcUrl: required("STARKNET_RPC_URL"),
  starknetChainId: process.env.STARKNET_CHAIN_ID || "SN_SEPOLIA",
  authAccessJwtSecret: (() => {
    const access = process.env.AUTH_ACCESS_JWT_SECRET || process.env.AUTH_JWT_SECRET;
    const refresh = process.env.AUTH_REFRESH_JWT_SECRET || process.env.AUTH_JWT_SECRET;
    if (!access) throw new Error("Missing AUTH_ACCESS_JWT_SECRET or AUTH_JWT_SECRET");
    if (!refresh) throw new Error("Missing AUTH_REFRESH_JWT_SECRET or AUTH_JWT_SECRET");
    if (access === refresh) {
      throw new Error(
        "AUTH_ACCESS_JWT_SECRET and AUTH_REFRESH_JWT_SECRET must be different (use two distinct secrets)"
      );
    }
    return access;
  })(),
  authRefreshJwtSecret: (() => {
    const refresh = process.env.AUTH_REFRESH_JWT_SECRET || process.env.AUTH_JWT_SECRET;
    if (!refresh) throw new Error("Missing AUTH_REFRESH_JWT_SECRET or AUTH_JWT_SECRET");
    return refresh;
  })(),
  authAccessTokenTtl: process.env.AUTH_ACCESS_TOKEN_TTL || "15m",
  authRefreshTokenTtl: process.env.AUTH_REFRESH_TOKEN_TTL || "30d",
  authSigninMessage: process.env.AUTH_SIGNIN_MESSAGE || "Lethe login",
};
