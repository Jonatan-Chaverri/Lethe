import { Router } from "express";
import { successResponse } from "../utils/formatting";

export const healthRoutes = Router();

healthRoutes.get("/", (_req, res) => {
  successResponse(res, {
    status: "ok",
    service: "lethe-backend",
    uptime_sec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
