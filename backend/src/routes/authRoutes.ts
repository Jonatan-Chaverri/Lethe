import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { authService } from "../services/authService";
import { successResponse } from "../utils/formatting";
import { asyncHandler } from "../utils/asyncHandler";
import { registerWalletRequestSchema } from "../validators/authSchemas";

export const authRoutes = Router();

authRoutes.post(
  "/register_wallet",
  validate(registerWalletRequestSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.registerWallet(req.body);
    successResponse(res, result);
  })
);

authRoutes.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    successResponse(res, { user: req.user });
  })
);
