-- CreateTable
CREATE TABLE "merkle_leaves" (
    "id" UUID NOT NULL,
    "commitment" TEXT NOT NULL,
    "leaf_index" BIGINT NOT NULL,
    "inserted_root" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merkle_leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merkle_roots" (
    "id" UUID NOT NULL,
    "root" TEXT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merkle_roots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "merkle_leaves_leaf_index_idx" ON "merkle_leaves"("leaf_index");

-- CreateIndex
CREATE INDEX "merkle_leaves_block_number_idx" ON "merkle_leaves"("block_number");

-- CreateIndex
CREATE INDEX "merkle_leaves_inserted_root_idx" ON "merkle_leaves"("inserted_root");

-- CreateIndex
CREATE INDEX "merkle_roots_block_number_idx" ON "merkle_roots"("block_number");
