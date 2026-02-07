-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('active', 'partially_withdrawn', 'closed');

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "deposit_commitment" TEXT NOT NULL,
    "deposit_amount_btc" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "deposit_shares" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "deposit_share_price" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "withdrawn_shares" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "withdraw_share_price" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "status" "TransactionStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_positions" (
    "user_id" UUID NOT NULL,
    "total_active_shares" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "total_deposited_btc" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "total_withdrawn_btc" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "realized_pnl" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "unrealized_pnl" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_positions_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_positions" ADD CONSTRAINT "user_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add non-negative check constraints for transactions
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_deposit_amount_btc_non_negative" CHECK ("deposit_amount_btc" >= 0);
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_deposit_shares_non_negative" CHECK ("deposit_shares" >= 0);
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_deposit_share_price_non_negative" CHECK ("deposit_share_price" >= 0);
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_withdrawn_shares_non_negative" CHECK ("withdrawn_shares" >= 0);
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_withdraw_share_price_non_negative" CHECK ("withdraw_share_price" >= 0);

-- Add non-negative check constraints for user_positions
ALTER TABLE "user_positions" ADD CONSTRAINT "user_positions_total_active_shares_non_negative" CHECK ("total_active_shares" >= 0);
ALTER TABLE "user_positions" ADD CONSTRAINT "user_positions_total_deposited_btc_non_negative" CHECK ("total_deposited_btc" >= 0);
ALTER TABLE "user_positions" ADD CONSTRAINT "user_positions_total_withdrawn_btc_non_negative" CHECK ("total_withdrawn_btc" >= 0);
