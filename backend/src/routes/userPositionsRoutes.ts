import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { successResponse } from "../utils/formatting";
import { weiToWbtc } from "@/lib/Contracts/utils/formatting";
import { UserPositionsService } from "@/services/userPositionsService";
import { deposit, getDepositEvents, getPurchasableUnits, getSharePrice, pollMerkleTreeEvents, getWithdrawEvents, withdraw } from "@/services/onchain/onChainVaultService";
import { proofToDepositCalldata, proofToWithdrawCalldata } from "@/services/onchain/garagaCalldataService";
import { increaseAllowance } from "@/services/onchain/OnChainWBTCService";
import { logger } from "@/lib/logger";
import { BTC_ATOMS, UNIT_ATOMS } from "@/lib/Contracts";
import { MerklePathService } from "@/services/merklePathService";
import { getEvents, getKUnitsPrice } from "@/services/onchain/onChainVaultService";
import { HttpError } from "@/lib/httpError";

export const userPositionsRoutes = Router();

const userPositionsService = new UserPositionsService();
const merklePathService = new MerklePathService();

userPositionsRoutes.get("/getShareUnitPrice", authMiddleware, async (req, res) => {
    const { id } = req.user!;
    const shareUnitPrice = await getKUnitsPrice(BigInt(1));
    successResponse(res, shareUnitPrice);
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
    successResponse(res, {
        transactions: tranasctions,
        deposit_fee: await depositTransaction.estimateInvokeFee(),
    });
});

userPositionsRoutes.post("/deposit/callback", authMiddleware, async (req, res) => {
    const { transaction_hash, deposit_units } = req.body as { transaction_hash: string, deposit_units: number };
    logger.info(`Deposit callback received for transaction ${transaction_hash} with ${deposit_units} units`);
    const events = await getDepositEvents(transaction_hash);
    if (!events || events.commitment_inserted.length === 0) {
        throw new HttpError(400, "No commitment inserted in transaction", "NO_COMMITMENT_INSERTED");
    }
    successResponse(res, { 
        commitment: String(events.commitment_inserted[0].commitment),
        leaf_index: Number(events.commitment_inserted[0].leaf_index),
    }, "Deposit callback received successfully");
});

userPositionsRoutes.post("/merkle/path", async (req, res) => {
    const { commitment, leaf_index } = req.body as {
        commitment: string;
        leaf_index: number;
    };
    const path = await merklePathService.buildPath(commitment, leaf_index);
    successResponse(res, path);
});

userPositionsRoutes.post("/withdraw", authMiddleware, async (req, res) => {
    const { id, wallet } = req.user!;
    const { proof, publicInputs, amount_btc } = req.body as { 
        proof: string; publicInputs: string[]; amount_btc: number 
    };
    const proofCalldata = await proofToWithdrawCalldata(proof, publicInputs);
    const withdrawTransaction = await withdraw(proofCalldata, wallet);
    successResponse(res, {
        transaction: withdrawTransaction.getTransactionDetails(),
        withdraw_fee: await withdrawTransaction.estimateInvokeFee(),
    });
});

userPositionsRoutes.post("/withdraw/callback", authMiddleware, async (req, res) => {
    const { transaction_hash } = req.body as { transaction_hash: string };
    const events = await getWithdrawEvents(transaction_hash);
    if (!events || events.nullifier_marked_as_spent.length === 0) {
        throw new HttpError(400, "No commitment inserted in transaction", "NO_COMMITMENT_INSERTED");
    }
    if (events.commitment_inserted.length === 0) {
        successResponse(res, {
            commitment: null,
            leaf_index: null,
        }, 'Withdraw successfully');
    } else {
        successResponse(res, {
            commitment: String(events.commitment_inserted[0].commitment),
            leaf_index: Number(events.commitment_inserted[0].leaf_index),
        }, 'Withdraw successfully');
    }
});

userPositionsRoutes.post("/events", async (req, res) => {
    const { from_block } = req.body as { from_block: number };
    const events = await pollMerkleTreeEvents();
    successResponse(res, events);
});
