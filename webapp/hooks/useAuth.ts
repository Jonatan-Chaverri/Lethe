"use client";

import { useAuthSession } from "@/providers/AuthProvider";

export function useAuth() {
  return useAuthSession();
}

