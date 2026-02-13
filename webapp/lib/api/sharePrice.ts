import { apiRequest, type ApiEnvelope } from "./client";

export type ChartDataPoint = {
  timestamp: number;
  price: number;
};

export type ChartInterval = "1m" | "1h" | "1d";
export type ChartRange = "1h" | "1d" | "7d";
const PRICE_SCALE_FACTOR = 100_000;

export async function fetchChartData(
  interval: ChartInterval,
  range: ChartRange
): Promise<ChartDataPoint[]> {
  const params = new URLSearchParams({ interval, range });
  const envelope = await apiRequest<ApiEnvelope<ChartDataPoint[]>>(
    `/api/sharePrice?${params.toString()}`,
    { method: "GET", auth: false }
  );
  return envelope.data.map((point) => ({
    ...point,
    price: point.price / PRICE_SCALE_FACTOR,
  }));
}

//0.01099728 - 0.001 = 0.00999728 -> 0.0998
// WITDRAW 99 units (had 100 units)
// price 0.01008 btc per share

// had 0,01099728 btc for 100 units -> 0,00010997 per unit
// witdraw 99 units for 0,001 -> 0.01088703 btc -> should widthdraw less units 