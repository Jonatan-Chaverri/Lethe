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
  authAccessJwtSecret: process.env.AUTH_ACCESS_JWT_SECRET || required("AUTH_JWT_SECRET"),
  authRefreshJwtSecret: process.env.AUTH_REFRESH_JWT_SECRET || required("AUTH_JWT_SECRET"),
  authAccessTokenTtl: process.env.AUTH_ACCESS_TOKEN_TTL || "15m",
  authRefreshTokenTtl: process.env.AUTH_REFRESH_TOKEN_TTL || "30d",
  authSigninMessage: process.env.AUTH_SIGNIN_MESSAGE || "Lethe login",
};
