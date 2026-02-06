# Lethe Backend

Simple Node.js backend with Express, Prisma, Starknet signature auth, and Zod validation.

## Endpoints

- `GET /api/health`
- `POST /api/auth/register_wallet`
- `GET /api/auth/me` (requires auth middleware)

## Project Structure

- `src/routes/` API routes only
- `src/middleware/` auth, error handling, request logging
- `src/services/db/` DB-only service layer (Prisma queries)
- `src/services/` business logic services
- `src/db/` Prisma client
- `src/lib/` shared utilities (env, logger, http errors)
- `src/validators/` Zod schemas
- `prisma/` schema and migrations

## Setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Configure env:

```bash
cp .env.example .env
```

Fill required values in `.env`:

- `DATABASE_URL`
- `STARKNET_RPC_URL`
- `AUTH_JWT_SECRET`

3. Run migrations:

```bash
npm run prisma:migrate:dev
```

4. Start API:

```bash
npm run dev
```

## Prisma Commands

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run prisma:studio
```

## Auth Flow

### Register wallet

`POST /api/auth/register_wallet`

Payload:

```json
{
  "wallet": "0x...",
  "wallet_provider": "argentx",
  "message_hash": "0x...",
  "signature": ["0x...", "0x..."],
  "name": "Optional",
  "email": "optional@example.com"
}
```

Behavior:

- Verifies Starknet signature against wallet account public key (`get_public_key`)
- Creates user in `users` table if not exists
- Returns JWT token and user payload

### Me

`GET /api/auth/me`

Header:

```text
Authorization: Bearer <token>
```

Behavior:

- Auth middleware verifies JWT
- Auth middleware loads user from DB and assigns to `req.user`
- Returns current user

## Required Database Table

Prisma model: `User` mapped to table `users`

Columns:

- `id` uuid primary key
- `name` text nullable
- `email` text nullable
- `wallet` text not null unique
- `created_at` timestamp
- `wallet_provider` text not null
