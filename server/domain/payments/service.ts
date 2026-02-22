import { Webhook } from "@portone/server-sdk";

import { captureAppError } from "@/lib/observability";
import {
  getPlanAmountKrw,
  getPortOneConfig,
  getPortOnePaymentClient,
  normalizeCycle,
  type BillingCycle
} from "@/lib/payments";
import {
  applyPaidEntitlementOnce,
  computeNextProUntil,
  computeNextScheduleAt
} from "@/lib/paymentsEntitlement";
import type {
  CheckoutInput,
  CheckoutPayload,
  ConfirmInput,
  ConfirmPayload,
  PaymentActor,
  PaymentServiceResult,
  PortalPayload,
  WebhookInput,
  WebhookPayload
} from "@/server/domain/payments/contracts";
import { PaymentsRepository } from "@/server/domain/payments/repository";

type CustomData = {
  userId?: number;
  cycle?: string;
  source?: string;
};

function buildIssueId(userId: number, cycle: BillingCycle): string {
  return `issue_${userId}_${cycle}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function buildPaymentId(userId: number, cycle: BillingCycle): string {
  return `pay_${userId}_${cycle}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function buildSchedulePaymentId(userId: number, cycle: BillingCycle): string {
  return `renew_${userId}_${cycle}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function resolveBillingPhoneNumber(): string {
  const raw = (process.env.PORTONE_BILLING_PHONE ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 11) return digits;
  return "01000000000";
}

function safeParseCustomData(raw: string | undefined): CustomData {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as CustomData;
  } catch {
    return {};
  }
}

export class PaymentsService {
  constructor(private readonly repo = new PaymentsRepository()) {}

  async createCheckout(actor: PaymentActor, input: CheckoutInput): Promise<PaymentServiceResult<CheckoutPayload>> {
    const config = getPortOneConfig();
    if (!config) {
      return { ok: false, status: 503, error: "결제 설정이 아직 완료되지 않았습니다.", metricUserId: actor.id };
    }

    const cycle = normalizeCycle(input.cycle);
    if (!cycle) {
      return { ok: false, status: 400, error: "지원하지 않는 결제 주기입니다.", metricUserId: actor.id };
    }

    const issueId = buildIssueId(actor.id, cycle);
    const phoneNumber = resolveBillingPhoneNumber();

    return {
      ok: true,
      status: 200,
      metricUserId: actor.id,
      payload: {
        request: {
          storeId: config.storeId,
          channelKey: config.channelKey,
          billingKeyMethod: "CARD",
          issueId,
          issueName: cycle === "monthly" ? "Oing PRO Monthly Billing Key" : "Oing PRO Yearly Billing Key",
          redirectUrl: `${input.publicOrigin}/pricing`,
          customer: {
            customerId: String(actor.id),
            email: actor.email,
            fullName: actor.email,
            phoneNumber
          },
          customData: {
            userId: actor.id,
            cycle
          }
        },
        cycle
      }
    };
  }

  async confirm(actor: PaymentActor, input: ConfirmInput): Promise<PaymentServiceResult<ConfirmPayload>> {
    const paymentClient = getPortOnePaymentClient();
    const config = getPortOneConfig();
    if (!paymentClient || !config) {
      return { ok: false, status: 503, error: "결제 설정이 아직 완료되지 않았습니다.", metricUserId: actor.id };
    }

    const cycle = normalizeCycle(input.cycle);
    if (!cycle) {
      return { ok: false, status: 400, error: "지원하지 않는 결제 주기입니다.", metricUserId: actor.id };
    }

    const paymentId = buildPaymentId(actor.id, cycle);
    await paymentClient.payWithBillingKey({
      paymentId,
      storeId: config.storeId,
      billingKey: input.billingKey,
      channelKey: config.channelKey,
      orderName: cycle === "monthly" ? "Oing PRO Monthly" : "Oing PRO Yearly",
      customer: { id: String(actor.id), email: actor.email },
      customData: JSON.stringify({ userId: actor.id, cycle, source: "initial" }),
      amount: { total: getPlanAmountKrw(cycle) },
      currency: "KRW"
    });

    const payment = await paymentClient.getPayment({
      paymentId,
      storeId: config.storeId
    });

    if (payment.status !== "PAID") {
      return { ok: false, status: 409, error: "결제가 아직 완료되지 않았습니다.", metricUserId: actor.id };
    }

    const expectedAmount = getPlanAmountKrw(cycle);
    if ((payment.amount.total ?? 0) !== expectedAmount) {
      return { ok: false, status: 400, error: "결제 금액 검증에 실패했습니다.", metricUserId: actor.id };
    }

    const billingKey = payment.billingKey || input.billingKey;
    const nextProUntil = computeNextProUntil({
      now: new Date(),
      currentProUntil: actor.proUntil,
      cycle
    });

    const entitlement = await this.repo.applyEntitlementAndCreateConfirmEvent({
      userId: actor.id,
      paymentId,
      billingKey,
      nextProUntil,
      cycle,
      applyPaidEntitlementOnce: (tx) =>
        applyPaidEntitlementOnce(tx, {
          userId: actor.id,
          paymentId,
          billingKey,
          nextProUntil,
          source: "confirm"
        })
    });

    if (entitlement.applied) {
      try {
        const scheduled = await this.scheduleNextBilling({
          userId: actor.id,
          userEmail: actor.email,
          billingKey,
          cycle,
          nextProUntil
        });
        if (scheduled.scheduleId) {
          await this.repo.setScheduleId(actor.id, scheduled.scheduleId);
        }
      } catch (error) {
        await captureAppError({
          route: "/api/payments/confirm",
          message: "portone_next_schedule_failed",
          stack: error instanceof Error ? error.stack : undefined,
          context: { err: error instanceof Error ? error.message : String(error), paymentId },
          userId: actor.id
        });
      }
    }

    return { ok: true, status: 200, payload: { ok: true, applied: entitlement.applied }, metricUserId: actor.id };
  }

  async cancelSubscription(actor: PaymentActor, publicOrigin: string): Promise<PaymentServiceResult<PortalPayload>> {
    const paymentClient = getPortOnePaymentClient();
    const config = getPortOneConfig();
    if (!paymentClient || !config) {
      return { ok: false, status: 503, error: "결제 설정이 아직 완료되지 않았습니다.", metricUserId: actor.id };
    }

    const billingState = await this.repo.findBillingState(actor.id);
    const billingKey = billingState?.stripeCustomerId ?? "";
    if (!billingKey) {
      return { ok: false, status: 400, error: "연결된 구독 결제 수단이 없습니다.", metricUserId: actor.id };
    }

    if (billingState?.stripeSubscriptionStatus !== "canceled") {
      try {
        await paymentClient.paymentSchedule.revokePaymentSchedules({
          storeId: config.storeId,
          billingKey
        });
      } catch (error) {
        await captureAppError({
          route: "/api/payments/portal",
          message: "portone_revoke_schedule_failed",
          stack: error instanceof Error ? error.stack : undefined,
          context: { err: error instanceof Error ? error.message : String(error) },
          userId: actor.id
        });
      }
    }

    await this.repo.markCanceled(actor.id);

    return {
      ok: true,
      status: 200,
      payload: { url: `${publicOrigin}/pricing?payment=cancel` },
      metricUserId: actor.id
    };
  }

  async processWebhook(input: WebhookInput): Promise<PaymentServiceResult<WebhookPayload>> {
    const config = getPortOneConfig();
    const paymentClient = getPortOnePaymentClient();
    if (!config || !paymentClient) {
      return { ok: false, status: 503, error: "PortOne webhook not configured." };
    }

    if (!input.headers.webhookId || !input.headers.webhookSignature || !input.headers.webhookTimestamp) {
      return { ok: false, status: 400, error: "Missing webhook headers." };
    }

    let webhook: Awaited<ReturnType<typeof Webhook.verify>>;
    try {
      webhook = await Webhook.verify(config.webhookSecret, input.payload, {
        "webhook-id": input.headers.webhookId,
        "webhook-signature": input.headers.webhookSignature,
        "webhook-timestamp": input.headers.webhookTimestamp
      });
    } catch (error) {
      await captureAppError({
        route: "/api/payments/webhook",
        message: "portone_webhook_verify_failed",
        context: { err: error instanceof Error ? error.message : String(error) }
      });
      return { ok: false, status: 400, error: "Invalid webhook signature." };
    }

    const providerEventId = `portone-webhook:${input.headers.webhookId}`;
    if (await this.repo.findWebhookDuplicate(providerEventId)) {
      return { ok: true, status: 200, payload: { ok: true, duplicate: true } };
    }

    let userId: number | null = null;
    let amount: number | null = null;
    let currency: string | null = null;
    let status = "ignored";

    try {
      if (
        webhook.type === "Transaction.Paid" ||
        webhook.type === "Transaction.Failed" ||
        webhook.type === "Transaction.Cancelled"
      ) {
        const paymentId = webhook.data.paymentId;
        const payment = await paymentClient.getPayment({
          paymentId,
          storeId: config.storeId
        });
        if (!("amount" in payment) || !("currency" in payment) || !("customData" in payment)) {
          throw new Error("Unrecognized payment payload.");
        }

        amount = payment.amount.total ?? null;
        currency = typeof payment.currency === "string" ? payment.currency : null;
        const customData = safeParseCustomData(payment.customData);
        const cycle = normalizeCycle(customData.cycle);
        const source = customData.source === "schedule" ? "schedule" : "initial";
        userId = await this.resolveWebhookUserId(paymentId, payment.billingKey, customData);

        if (webhook.type === "Transaction.Paid" && payment.status === "PAID" && userId && cycle && payment.billingKey) {
          const user = await this.repo.findWebhookUser(userId);
          if (user) {
            const nextProUntil = computeNextProUntil({
              now: new Date(),
              currentProUntil: user.proUntil,
              cycle
            });

            const entitlement = await this.repo.applyEntitlementInWebhook({
              userId: user.id,
              paymentId,
              billingKey: payment.billingKey,
              nextProUntil,
              subscriptionStatus: user.stripeSubscriptionStatus === "canceled" ? "canceled" : "active",
              applyPaidEntitlementOnce: (tx) =>
                applyPaidEntitlementOnce(tx, {
                  userId: user.id,
                  paymentId,
                  billingKey: payment.billingKey!,
                  nextProUntil,
                  subscriptionStatus: user.stripeSubscriptionStatus === "canceled" ? "canceled" : "active",
                  source: "webhook"
                })
            });

            if (entitlement.applied) {
              if (user.stripeSubscriptionStatus !== "canceled") {
                try {
                  const scheduled = await this.scheduleNextBilling({
                    userId: user.id,
                    userEmail: user.email,
                    billingKey: payment.billingKey,
                    cycle,
                    nextProUntil
                  });
                  if (scheduled.scheduleId) {
                    await this.repo.setScheduleId(user.id, scheduled.scheduleId);
                  }
                } catch (error) {
                  await captureAppError({
                    route: "/api/payments/webhook",
                    message: "portone_schedule_renewal_failed",
                    stack: error instanceof Error ? error.stack : undefined,
                    context: { err: error instanceof Error ? error.message : String(error), paymentId },
                    userId: user.id
                  });
                }
              }
              status = source === "schedule" ? "processed_renewal" : "processed_fallback";
            } else {
              status = source === "schedule" ? "duplicate_renewal" : "already_processed";
            }
          }
        } else if (webhook.type === "Transaction.Failed") {
          status = "failed";
        } else if (webhook.type === "Transaction.Cancelled") {
          status = "cancelled";
        }
      }

      await this.repo.createWebhookEvent({
        userId,
        providerEventId,
        eventType: String(webhook.type),
        status,
        amount,
        currency,
        rawJson: webhook as unknown as object
      });

      return { ok: true, status: 200, payload: { ok: true, status }, metricUserId: userId };
    } catch (error) {
      await captureAppError({
        route: "/api/payments/webhook",
        message: "portone_webhook_processing_failed",
        stack: error instanceof Error ? error.stack : undefined,
        context: { err: error instanceof Error ? error.message : String(error), eventId: providerEventId },
        userId
      });

      try {
        await this.repo.createWebhookEvent({
          userId,
          providerEventId,
          eventType: "unknown",
          status: "error",
          amount,
          currency,
          rawJson: {
            payload: input.payload,
            error: error instanceof Error ? error.message : String(error)
          }
        });
      } catch {
        // Best effort only.
      }

      return { ok: false, status: 500, error: "Webhook processing failed.", metricUserId: userId };
    }
  }

  private async scheduleNextBilling(input: {
    userId: number;
    userEmail: string;
    billingKey: string;
    cycle: BillingCycle;
    nextProUntil: Date;
  }): Promise<{ scheduleId: string | null }> {
    const paymentClient = getPortOnePaymentClient();
    const config = getPortOneConfig();
    if (!paymentClient || !config) return { scheduleId: null };

    const nextPayAt = computeNextScheduleAt(input.nextProUntil);
    const amount = getPlanAmountKrw(input.cycle);
    const paymentId = buildSchedulePaymentId(input.userId, input.cycle);

    const schedule = await paymentClient.paymentSchedule.createPaymentSchedule({
      paymentId,
      timeToPay: nextPayAt.toISOString(),
      payment: {
        storeId: config.storeId,
        billingKey: input.billingKey,
        channelKey: config.channelKey,
        orderName: input.cycle === "monthly" ? "Oing PRO Monthly Renewal" : "Oing PRO Yearly Renewal",
        customer: { id: String(input.userId), email: input.userEmail },
        customData: JSON.stringify({ userId: input.userId, cycle: input.cycle, source: "schedule" }),
        amount: { total: amount },
        currency: "KRW"
      }
    });

    return { scheduleId: schedule.schedule.id };
  }

  private async resolveWebhookUserId(
    paymentId: string,
    billingKey: string | undefined,
    customData: CustomData
  ): Promise<number | null> {
    if (Number.isFinite(customData.userId) && (customData.userId ?? 0) > 0) {
      return Math.floor(customData.userId as number);
    }
    if (billingKey) {
      const fromBillingKey = await this.repo.findUserIdByBillingKey(billingKey);
      if (fromBillingKey) return fromBillingKey;
    }
    return this.repo.findUserIdByConfirmPaymentId(paymentId);
  }
}
