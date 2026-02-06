import dotenv from "dotenv";

dotenv.config();

function required(name) {
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
  authJwtSecret: required("AUTH_JWT_SECRET"),
  authTokenTtl: process.env.AUTH_TOKEN_TTL || "7d",
  authSigninMessage: process.env.AUTH_SIGNIN_MESSAGE || "Lethe login",
};
