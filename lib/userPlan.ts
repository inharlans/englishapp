export type UserPlanCode = "FREE" | "PRO";

export function isActiveProPlan(input: {
  plan: UserPlanCode;
  proUntil: Date | null;
  nowMs?: number;
}): boolean {
  if (input.plan !== "PRO") return false;
  if (!input.proUntil) return true;
  const nowMs = input.nowMs ?? Date.now();
  return input.proUntil.getTime() >= nowMs;
}

export function getEffectivePlan(input: {
  plan: UserPlanCode;
  proUntil: Date | null;
  nowMs?: number;
}): UserPlanCode {
  return isActiveProPlan(input) ? "PRO" : "FREE";
}
