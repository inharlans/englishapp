import type { BillingCycle } from "@/lib/payments";

export interface PaymentActor {
  id: number;
  email: string;
  plan: "FREE" | "PRO";
  proUntil: Date | null;
}

export interface CheckoutInput {
  cycle: string;
  publicOrigin: string;
}

export interface CheckoutPayload {
  request: {
    storeId: string;
    channelKey: string;
    billingKeyMethod: "CARD";
    issueId: string;
    issueName: string;
    redirectUrl: string;
    customer: {
      customerId: string;
      email: string;
      fullName: string;
      phoneNumber: string;
    };
    customData: {
      userId: number;
      cycle: BillingCycle;
    };
  };
  cycle: BillingCycle;
}

export interface ConfirmInput {
  billingKey: string;
  cycle: string;
}

export interface ConfirmPayload {
  ok: true;
  applied: boolean;
}

export interface PortalPayload {
  url: string;
}

export interface WebhookInput {
  payload: string;
  headers: {
    webhookId: string;
    webhookSignature: string;
    webhookTimestamp: string;
  };
}

export interface WebhookPayload {
  ok: true;
  status?: string;
  duplicate?: boolean;
}

export type PaymentServiceResult<T> =
  | { ok: true; status: 200; payload: T; metricUserId?: number | null }
  | { ok: false; status: number; error: string; metricUserId?: number | null };
