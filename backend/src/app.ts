import "express-async-errors";
import cors from "cors";
import express from "express";
import 'express-async-errors';
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { authRoutes } from "./routes/authRoutes";
import { healthRoutes } from "./routes/healthRoutes";
import { requestId } from "./middleware/requestId";
import { onChainRoutes } from "./routes/onChainRoutes";
import { userPositionsRoutes } from "./routes/userPositionsRoutes";
import { sharePriceRoutes } from "./routes/sharePriceRoutes";
import { env } from "./lib/env";

function allowedOrigin(
  requestOrigin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void {
  if (!requestOrigin) {
    callback(null, true);
    return;
  }
  try {
    const url = new URL(requestOrigin);
    const isLocalhost =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const normalizedOrigin = url.origin.toLowerCase();
    const configured = env.corsAllowedOrigins.some(
      (origin) => origin.toLowerCase() === normalizedOrigin
    );
    const isVercel = url.hostname.endsWith(".vercel.app");
    callback(null, isLocalhost || configured || isVercel);
  } catch {
    callback(null, false);
  }
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: allowedOrigin,
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(requestId);
  app.use(requestLogger);

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/onchain", onChainRoutes);
  app.use("/api/user-positions", userPositionsRoutes);
  app.use("/api/sharePrice", sharePriceRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
