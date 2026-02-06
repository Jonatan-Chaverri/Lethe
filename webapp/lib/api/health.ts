import { apiRequest } from "./client";

export interface HealthResponse {
  status: "ok";
  service: string;
  uptime_sec: number;
  timestamp: string;
}

export async function health() {
  const result = await apiRequest<HealthResponse>("/api/health");
  console.log(result);
  return result.status === "ok";
}
