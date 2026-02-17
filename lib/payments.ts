import Stripe from "stripe";

export type BillingCycle = "monthly" | "yearly";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!secretKey) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
  }
  return stripeClient;
}

export function getPriceId(cycle: BillingCycle): string | null {
  if (cycle === "monthly") return process.env.STRIPE_PRICE_MONTHLY?.trim() ?? null;
  return process.env.STRIPE_PRICE_YEARLY?.trim() ?? null;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getCycleDays(cycle: BillingCycle): number {
  return cycle === "monthly" ? 30 : 365;
}

export function normalizeCycle(raw: string | null | undefined): BillingCycle | null {
  if (raw === "monthly" || raw === "yearly") return raw;
  return null;
}
