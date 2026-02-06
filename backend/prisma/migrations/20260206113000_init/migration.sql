CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT,
  "email" TEXT,
  "wallet" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "wallet_provider" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_wallet_key" ON "users" ("wallet");
