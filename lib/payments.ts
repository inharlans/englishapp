import { PaymentClient } from "@portone/server-sdk";

export type BillingCycle = "monthly" | "yearly";

type PortOneConfig = {
  apiSecret: string;
  webhookSecret: string;
  storeId: string;
  channelKey: string;
};

let paymentClientSingleton: ReturnType<typeof PaymentClient> | null = null;

function asPositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw ?? "");
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export function getPortOneConfig(): PortOneConfig | null {
  const apiSecret = process.env.PORTONE_API_SECRET?.trim() ?? "";
  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET?.trim() ?? "";
  const storeId = process.env.PORTONE_STORE_ID?.trim() ?? "";
  const channelKey = process.env.PORTONE_CHANNEL_KEY?.trim() ?? "";
  if (!apiSecret || !webhookSecret || !storeId || !channelKey) return null;
  return { apiSecret, webhookSecret, storeId, channelKey };
}

export function getPortOnePaymentClient() {
  const config = getPortOneConfig();
  if (!config) return null;
  if (!paymentClientSingleton) {
    paymentClientSingleton = PaymentClient({ secret: config.apiSecret });
  }
  return paymentClientSingleton;
}

export function getPlanAmountKrw(cycle: BillingCycle): number {
  const monthly = asPositiveInt(process.env.PORTONE_PRICE_MONTHLY_KRW, 2900);
  const yearly = asPositiveInt(process.env.PORTONE_PRICE_YEARLY_KRW, 29000);
  return cycle === "monthly" ? monthly : yearly;
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
