import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { successResponse } from "../utils/formatting";
import { getBalanceOf, mintTestnetWBTC } from "@/services/onchain/OnChainWBTCService";
import { HttpError } from "@/lib/httpError";
import { weiToWbtc } from "@/lib/Contracts/utils/formatting";

export const onChainRoutes = Router();

onChainRoutes.get("/getWBTCBalance", authMiddleware, async (req, res) => {
    const { wallet } = req.user!;
    const result = await getBalanceOf(wallet);
    successResponse(res, result);
});

onChainRoutes.get("/mintTestnetWBTC", authMiddleware, async (req, res) => {
    const { wallet } = req.user!;
    const currentBalance = weiToWbtc(BigInt(await getBalanceOf(wallet)));
    if (currentBalance >= 5) {
        throw new HttpError(400, "You already have the maximum amount of WBTC");
    }
    const result = await mintTestnetWBTC(1, wallet);
    successResponse(res, result);
});
