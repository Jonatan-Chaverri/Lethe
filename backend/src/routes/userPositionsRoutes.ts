import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { successResponse } from "../utils/formatting";
import { weiToWbtc } from "@/lib/Contracts/utils/formatting";
import { UserPositionsService } from "@/services/userPositionsService";
import { getSharePrice } from "@/services/onchain/onChainVaultService";

export const userPositionsRoutes = Router();

const userPositionsService = new UserPositionsService();

userPositionsRoutes.get("/getCurrentPosition", authMiddleware, async (req, res) => {
    const { id } = req.user!;
    const userPosition = await userPositionsService.getUserPosition(id);
    const sharePrice = await getSharePrice();
    const totalShares = userPosition?.total_active_shares ?? 0;
    const totalAssets = sharePrice * BigInt(totalShares);
    const totalYield = totalAssets - BigInt(userPosition?.total_deposited_btc ?? 0);
    const result = {
        current_balance: weiToWbtc(totalAssets),
        total_yield: weiToWbtc(totalYield),
    };
    successResponse(res, result);
});
