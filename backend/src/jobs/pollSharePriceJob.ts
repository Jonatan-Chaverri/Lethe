import { pollSharePrice } from "@/services/sharePriceService";
import { logger } from "@/lib/logger";

const POLL_INTERVAL_MS = 60_000; // 1 minute

export function startPollSharePriceJob(): () => void {
  logger.info("Starting poll share price job...");
  let running = false;

  const run = async () => {
    if (running) {
      logger.warn("poll_share_price_skipped_previous_run_still_active");
      return;
    }

    running = true;
    try {
      await pollSharePrice();
      logger.debug("poll_share_price_completed");
    } catch (error) {
      logger.error({ err: error }, "poll_share_price_failed");
    } finally {
      running = false;
    }
  };

  void run();
  const timer = setInterval(() => {
    void run();
  }, POLL_INTERVAL_MS);

  return () => {
    clearInterval(timer);
  };
}
