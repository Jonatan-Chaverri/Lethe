import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { authService } from "../services/authService.js";
import { registerWalletRequestSchema } from "../validators/authSchemas.js";

export const authRoutes = Router();

authRoutes.post("/register_wallet", validate(registerWalletRequestSchema), async (req, res, next) => {
  try {
    const result = await authService.registerWallet(req.body);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

authRoutes.get("/me", authMiddleware, (req, res) => {
  res.status(200).json({ user: req.user });
});
