import { Router } from "express";
import { successResponse } from "../utils/formatting";
import { fetchChartData, type Interval, type Range } from "@/services/sharePriceService";
import { HttpError } from "@/lib/httpError";
import { logger } from "@/lib/logger";

const VALID_INTERVALS: Interval[] = ["1m", "1h", "1d"];
const VALID_RANGES: Range[] = ["1h", "1d", "7d"];

export const sharePriceRoutes = Router();

sharePriceRoutes.get("/", async (req, res) => {
  const interval = req.query.interval as string | undefined;
  const range = req.query.range as string | undefined;

  if (!interval || !VALID_INTERVALS.includes(interval as Interval)) {
    throw new HttpError(
      400,
      `Invalid or missing interval. Must be one of: ${VALID_INTERVALS.join(", ")}`
    );
  }
  if (!range || !VALID_RANGES.includes(range as Range)) {
    throw new HttpError(
      400,
      `Invalid or missing range. Must be one of: ${VALID_RANGES.join(", ")}`
    );
  }

  const data = await fetchChartData(interval as Interval, range as Range);
  logger.info(`interval: ${interval}, range: ${range}, data: ${JSON.stringify(data)}`);
  successResponse(res, data);
});
