import { apiFetch } from "@/lib/clientApi";

import { parseApiResponse } from "@/lib/api/base";

export type BillingCycle = "monthly" | "yearly";

export type CheckoutRequest = {
  storeId: string;
  channelKey: string;
  billingKeyMethod: "CARD";
  issueId: string;
  issueName: string;
  redirectUrl: string;
  customer?: {
    customerId?: string;
    email?: string;
    fullName?: string;
  };
  customData?: {
    userId: number;
    cycle: BillingCycle;
  };
};

export async function createCheckout(cycle: BillingCycle): Promise<CheckoutRequest> {
  const res = await apiFetch("/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cycle })
  });
  const json = await parseApiResponse<{ request?: CheckoutRequest }>(
    res,
    "Failed to create checkout request.",
    "payments.checkout"
  );
  if (!json.request) throw new Error("Failed to create checkout request.");
  return json.request;
}

export async function confirmPayment(input: { billingKey: string; cycle: BillingCycle }): Promise<void> {
  const res = await apiFetch("/api/payments/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const json = await parseApiResponse<{ ok?: boolean }>(res, "Failed to confirm payment.", "payments.confirm");
  if (!json.ok) throw new Error("Failed to confirm payment.");
}

export async function getPortalUrl(): Promise<string> {
  const res = await apiFetch("/api/payments/portal", { method: "POST" });
  const json = await parseApiResponse<{ url?: string }>(res, "Failed to get portal url.", "payments.portal");
  if (!json.url) throw new Error("Failed to get portal url.");
  return json.url;
}
