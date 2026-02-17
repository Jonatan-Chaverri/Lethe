import { ContractFactory } from "@/lib/Contracts";
import { sharePriceDbService } from "./db/sharePriceDbService";
import { logger } from "@/lib/logger";

const contractFactory = new ContractFactory();

const INTERVAL_MS: Record<string, number> = {
  "1m": 60 * 1000,
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

const RANGE_MS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

export type ChartDataPoint = {
  timestamp: number;
  price: number;
};

export type Interval = "1m" | "1h" | "1d";
export type Range = "1h" | "1d" | "7d";

export async function pollSharePrice(): Promise<void> {
  const vaultService = contractFactory.getVaultService();
  const result = await vaultService.getKUnitsPrice(1n).call();
  const priceFromChain =
    typeof result === "bigint"
      ? result
      : (result as { result?: bigint[] }).result?.[0] ?? result;
  const priceStr = String(priceFromChain);

  const latest = await sharePriceDbService.getLatest();
  const latestPriceStr = latest?.price_per_k_unit?.toString() ?? null;

  if (latestPriceStr !== priceStr) {
    logger.info(`Share price changed from ${latestPriceStr} to ${priceStr}`);
    await sharePriceDbService.insert({ pricePerKUnit: priceStr });
  }
}

export async function fetchChartData(
  interval: Interval,
  range: Range
): Promise<ChartDataPoint[]> {
  const intervalMs = INTERVAL_MS[interval];
  const rangeMs = RANGE_MS[range];

  if (!intervalMs || !rangeMs) {
    throw new Error(`Invalid interval or range. interval: ${interval}, range: ${range}`);
  }

  const to = new Date();
  const from = new Date(to.getTime() - rangeMs);

  let prices = await sharePriceDbService.findByTimeRange(from, to);

  // When no prices in range (e.g. 1d but last price was a week ago),
  // use the latest price as the current price for the entire range
  if (prices.length === 0) {
    const latest = await sharePriceDbService.getLatest();
    if (!latest) return [];
    prices = [latest];
  }

  const dataPoints: ChartDataPoint[] = [];
  let currentTs = from.getTime();
  const endTs = to.getTime();

  while (currentTs <= endTs) {
    const currentDate = new Date(currentTs);

    const priceAtTime = prices
      .filter((p) => p.created_at <= currentDate)
      .pop();

    const price = priceAtTime
      ? Number(priceAtTime.price_per_k_unit)
      : Number(prices[0].price_per_k_unit);

    dataPoints.push({
      timestamp: Math.floor(currentTs / 1000),
      price,
    });

    currentTs += intervalMs;
  }

  return dataPoints;
}
