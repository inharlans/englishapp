import { apiFetch } from "@/lib/clientApi";

import { parseApiResponse } from "@/lib/api/base";

export async function unblockOwner(ownerId: number): Promise<void> {
  const res = await apiFetch("/api/blocked-owners", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId })
  });
  await parseApiResponse<{ ok?: boolean }>(res, "Failed to unblock owner.", "blockedOwners.unblock");
}
