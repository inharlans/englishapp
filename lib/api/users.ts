import { apiFetch } from "@/lib/clientApi";

import { parseApiResponse } from "@/lib/api/base";

export async function updateDailyGoal(dailyGoal: number): Promise<void> {
  const res = await apiFetch("/api/users/me/daily-goal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dailyGoal })
  });
  await parseApiResponse<{ ok?: boolean }>(res, "Failed to update daily goal.", "users.dailyGoal");
}
