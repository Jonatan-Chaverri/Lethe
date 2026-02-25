# Lethe Backend

TypeScript backend with Express, Prisma, Starknet signature auth, and Zod validation.

## Endpoints

### Health

- `GET /api/health`

### Auth

- `POST /api/auth/register_wallet`
- `GET /api/auth/me` (requires auth middleware)
- `POST /api/auth/refresh`

### On-chain helper APIs

- `GET /api/onchain/getWBTCBalance` (auth required)
  - Reads connected user wallet `MockWBTC` balance.
- `GET /api/onchain/mintTestnetWBTC` (auth required)
  - Mints test `MockWBTC` to the authenticated wallet (guarded by backend cap check).

### User positions / vault APIs

- `GET /api/user-positions/getShareUnitPrice` (auth required)
  - Returns current price of `1` share unit.
- `POST /api/user-positions/getPurchasableUnits` (auth required)
  - Body: `{ "amount_btc": number }`
  - Returns purchasable share units for amount.
- `POST /api/user-positions/deposit` (auth required)
  - Body: `{ "proof": string, "publicInputs": string[], "amount_btc": number }`
  - Returns transactions payload for allowance + deposit invoke.
- `POST /api/user-positions/deposit/callback` (auth required)
  - Body: `{ "transaction_hash": string, "deposit_units": number }`
  - Parses chain events and returns inserted commitment/leaf index.
- `POST /api/user-positions/merkle/path` (no auth)
  - Body: `{ "commitment": string, "leaf_index": number }`
  - Returns Merkle path elements/indices and root for proof generation.
- `POST /api/user-positions/withdraw` (auth required)
  - Body: `{ "proof": string, "publicInputs": string[], "amount_btc": number }`
  - Returns withdraw transaction payload + estimated fee.
- `POST /api/user-positions/withdraw/callback` (auth required)
  - Body: `{ "transaction_hash": string }`
  - Parses withdrawal events and returns optional change note commitment.
- `POST /api/user-positions/events` (no auth)
  - Body: `{ "from_block": number }`
  - Polls/returns Merkle tree event data.

### Share price chart API

- `GET /api/sharePrice?interval=<1m|1h|1d>&range=<1h|1d|7d>`
  - Returns chart points used by dashboard share-price graph.

## Project Structure

- `src/routes/` API routes only
- `src/middleware/` auth, validation, error handling, request logging
- `src/services/db/` DB-only service layer (Prisma queries)
- `src/services/` business logic services
- `src/db/` Prisma client
- `src/lib/` shared utilities (env, logger, http errors)
- `src/validators/` Zod schemas
- `src/types/` shared TypeScript types
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
npm run prisma:migrate
```

4. Generate Prisma client:

```bash
npm run prisma:generate
```

5. Start API:

```bash
npm run dev
```

## TypeScript

```bash
npm run typecheck
```

## Prisma Commands

```bash
npm run prisma:generate
npm run prisma:migrate
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
- Creates a new row in `sessions` for every login/register
- Stores the issued refresh token in `refresh_tokens`
- Returns `access_token`, `refresh_token`, and user payload

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

### Refresh

`POST /api/auth/refresh`

Payload:

```json
{
  "refresh_token": "..."
}
```

Behavior:

- Verifies refresh token
- Verifies refresh token exists in `refresh_tokens` and belongs to an active session
- Rotates refresh token in DB (old token removed, new token stored)
- Issues a new session (`access_token` + `refresh_token`)

## Additional request/response notes

- Most protected endpoints require:
  - `Authorization: Bearer <access_token>`
- API responses are wrapped through `successResponse(...)`.
- Errors are normalized through the global error middleware (`HttpError` + `errorHandler`).

## Required Database Table

Prisma model: `User` mapped to table `users`

Columns:

- `id` uuid primary key
- `name` text nullable
- `email` text nullable
- `wallet` text not null unique
- `created_at` timestamp
- `wallet_provider` text not null
