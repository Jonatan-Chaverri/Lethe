import { Router } from "express";

export const healthRoutes = Router();

healthRoutes.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "lethe-backend",
    uptime_sec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
