import { Router } from "express";
import { successResponse } from "../utils/formatting";
import { logger } from "../lib/logger";

export const healthRoutes = Router();

healthRoutes.get("/", async (_req, res) => {
  successResponse(res, {
    status: "ok",
    service: "lethe-backend",
    uptime_sec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
