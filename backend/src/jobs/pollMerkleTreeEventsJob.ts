import { pollMerkleTreeEvents } from "@/services/onchain/onChainVaultService";
import { logger } from "@/lib/logger";

const POLL_INTERVAL_MS = 30_000;

export function startPollMerkleTreeEventsJob(): () => void {
  logger.info("Starting poll merkle tree events job...");
  let running = false;

  const run = async () => {
    if (running) {
      logger.warn("poll_merkle_tree_events_skipped_previous_run_still_active");
      return;
    }

    running = true;
    try {
      const events = await pollMerkleTreeEvents();
      logger.info(
        {
          commitmentInsertedCount: events.commitment_inserted.length,
        },
        "poll_merkle_tree_events_completed"
      );
    } catch (error) {
      logger.error({ err: error }, "poll_merkle_tree_events_failed");
    } finally {
      running = false;
    }
  };

  // Run once at startup, then continue in the background.
  void run();
  const timer = setInterval(() => {
    void run();
  }, POLL_INTERVAL_MS);

  return () => {
    clearInterval(timer);
  };
}
