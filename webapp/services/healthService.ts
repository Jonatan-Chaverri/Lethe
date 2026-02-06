import { health } from "@/lib/api/health";

export const healthService = {
  async check() {
    return health();
  },
};
