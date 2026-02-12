import { createApp } from "./app";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { startPollMerkleTreeEventsJob } from "./jobs/pollMerkleTreeEventsJob";

const app = createApp();

app.listen(env.port, () => {
  logger.info({ port: env.port, env: env.nodeEnv }, "server_started");
});

const stopPollMerkleTreeEventsJob = startPollMerkleTreeEventsJob();

const shutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, "server_shutdown_requested");
  stopPollMerkleTreeEventsJob();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
