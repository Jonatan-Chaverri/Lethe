import { apiRequest, type ApiEnvelope } from "./client";

export interface HealthResponse {
  status: "ok";
  service: string;
  uptime_sec: number;
  timestamp: string;
}

export async function health() {
  const envelope = await apiRequest<ApiEnvelope<HealthResponse>>("/api/health");
  const result = envelope.data;
  return result.status === "ok";
}
