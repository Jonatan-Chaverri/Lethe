import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { authService } from "../services/authService";
import { successResponse } from "../utils/formatting";
import { asyncHandler } from "../utils/asyncHandler";
import {
  refreshSessionRequestSchema,
  registerWalletRequestSchema,
} from "../validators/authSchemas";

export const authRoutes = Router();

authRoutes.post("/register_wallet", validate(registerWalletRequestSchema), async (req, res) => {
  const result = await authService.registerWallet(req.body, {
    userAgent: req.get("user-agent") ?? null,
    ipAddress: req.ip ?? null,
  });
  successResponse(res, result);
});

authRoutes.get("/me", authMiddleware, async (req, res) => {
    successResponse(res, { user: req.user });
});

authRoutes.post(
  "/refresh",
  validate(refreshSessionRequestSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.refreshSession(req.body, {
      userAgent: req.get("user-agent") ?? null,
      ipAddress: req.ip ?? null,
    });
    successResponse(res, result);
  })
);
