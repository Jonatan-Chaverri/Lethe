import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { successResponse } from "../utils/formatting";
import { weiToWbtc } from "@/lib/Contracts/utils/formatting";
import { UserPositionsService } from "@/services/userPositionsService";
import { deposit, getDepositEvents, getPurchasableUnits, getSharePrice } from "@/services/onchain/onChainVaultService";
import { proofToDepositCalldata } from "@/services/onchain/garagaCalldataService";
import { increaseAllowance } from "@/services/onchain/OnChainWBTCService";
import { logger } from "@/lib/logger";
import { BTC_ATOMS, UNIT_ATOMS } from "@/lib/Contracts";
import { MerklePathService } from "@/services/merklePathService";

export const userPositionsRoutes = Router();

const userPositionsService = new UserPositionsService();
const merklePathService = new MerklePathService();

userPositionsRoutes.get("/getCurrentPosition", authMiddleware, async (req, res) => {
    const { id } = req.user!;
    const userPosition = await userPositionsService.getUserPosition(id);
    const sharePrice = await getSharePrice();
    logger.info(`Share price for user ${id} is ${sharePrice}`);
    const totalShares = userPosition?.total_active_shares ?? 0;
    const totalAssets = sharePrice * BigInt(totalShares) * UNIT_ATOMS / BTC_ATOMS;
    const totalYield = totalAssets - BigInt(userPosition?.total_deposited_btc ?? 0);
    logger.info(`Total assets for user ${id} is ${totalAssets}`);
    logger.info(`Total yield for user ${id} is ${totalYield}`);
    const result = {
        current_balance: weiToWbtc(totalAssets),
        total_yield: weiToWbtc(totalYield),
    };
    logger.info(`Current position for user ${id} is ${JSON.stringify(result)}`);
    successResponse(res, result);
});

userPositionsRoutes.post("/getPurchasableUnits", authMiddleware, async (req, res) => {
    const { amount_btc } = req.body;
    const purchasableUnits = await getPurchasableUnits(BigInt(amount_btc));
    successResponse(res, purchasableUnits);
});

userPositionsRoutes.post("/deposit", authMiddleware, async (req, res) => {
    const { proof, publicInputs, amount_btc } = req.body as { 
        proof: string; publicInputs: string[]; amount_btc: number 
    };
    const proofCalldata = await proofToDepositCalldata(proof, publicInputs);
    const depositTransaction = await deposit(proofCalldata);
    const increaseAllowanceTransaction = increaseAllowance(BigInt(amount_btc));
    const tranasctions = [
        increaseAllowanceTransaction.getTransactionDetails(), 
        depositTransaction.getTransactionDetails()
    ];
    successResponse(res, tranasctions);
});

userPositionsRoutes.post("/deposit/callback", authMiddleware, async (req, res) => {
    const { id, wallet } = req.user!;
    const { transaction_hash, deposit_units } = req.body as { transaction_hash: string, deposit_units: number, share_price: number };
    logger.info(`Deposit callback received for transaction ${transaction_hash} with ${deposit_units} units`);
    const events = await getDepositEvents(transaction_hash);
    const sharePrice = await getSharePrice();
    await userPositionsService.registerUserDeposit(id, wallet, deposit_units, Number(sharePrice), events);
    const insertedCommitment = events.commitment_inserted[0];
    successResponse(
        res,
        {
            commitment: insertedCommitment?.commitment ?? null,
            leaf_index: insertedCommitment?.leaf_index ?? null,
        },
        "Deposit callback received successfully"
    );
});

userPositionsRoutes.post("/merkle/path", async (req, res) => {
    const { commitment, leaf_index } = req.body as {
        commitment: string;
        leaf_index: number;
    };
    const path = await merklePathService.buildPath(commitment, leaf_index);
    successResponse(res, path);
});
