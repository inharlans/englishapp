import { apiFetch } from "@/lib/clientApi";

import { parseApiResponse } from "@/lib/api/base";

export async function loginWithEmail(input: { email: string; password: string }): Promise<void> {
  const res = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  await parseApiResponse<{ ok?: boolean }>(res, "Failed to login.", "auth.login");
}

export async function logoutSession(): Promise<void> {
  const res = await apiFetch("/api/auth/logout", { method: "POST" });
  await parseApiResponse<{ ok?: boolean }>(res, "Failed to logout.", "auth.logout");
}
