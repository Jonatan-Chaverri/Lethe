-- CreateTable
CREATE TABLE "share_price" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "price_per_k_unit" DECIMAL(36,18) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_price_pkey" PRIMARY KEY ("id")
);
