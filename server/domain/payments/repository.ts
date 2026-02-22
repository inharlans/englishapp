import { prisma } from "@/lib/prisma";

export class PaymentsRepository {
  async findBillingState(userId: number): Promise<{
    stripeCustomerId: string | null;
    stripeSubscriptionStatus: string | null;
  } | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, stripeSubscriptionStatus: true }
    });
    return user ?? null;
  }

  async markCanceled(userId: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeSubscriptionStatus: "canceled",
        stripeSubscriptionId: null
      }
    });
  }

  async setScheduleId(userId: number, scheduleId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { stripeSubscriptionId: scheduleId }
    });
  }

  async createConfirmEvent(input: {
    userId: number;
    paymentId: string;
    cycle: "monthly" | "yearly";
    billingKey: string;
  }): Promise<void> {
    await prisma.paymentEvent.create({
      data: {
        userId: input.userId,
        provider: "portone",
        providerEventId: `portone-confirm:${input.paymentId}`,
        eventType: "confirm.paid",
        status: "processed",
        rawJson: {
          cycle: input.cycle,
          paymentId: input.paymentId,
          billingKey: input.billingKey,
          scheduleId: null
        }
      }
    });
  }

  async findWebhookDuplicate(providerEventId: string): Promise<boolean> {
    const duplicate = await prisma.paymentEvent.findUnique({
      where: { providerEventId },
      select: { id: true }
    });
    return Boolean(duplicate);
  }

  async findUserIdByBillingKey(billingKey: string): Promise<number | null> {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: billingKey },
      select: { id: true }
    });
    return user?.id ?? null;
  }

  async findUserIdByConfirmPaymentId(paymentId: string): Promise<number | null> {
    const byEvent = await prisma.paymentEvent.findFirst({
      where: {
        provider: "portone",
        providerEventId: `portone-confirm:${paymentId}`
      },
      select: { userId: true }
    });
    return byEvent?.userId ?? null;
  }

  async findWebhookUser(userId: number): Promise<{
    id: number;
    email: string;
    proUntil: Date | null;
    stripeSubscriptionStatus: string | null;
  } | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        proUntil: true,
        stripeSubscriptionStatus: true
      }
    });
    return user ?? null;
  }

  async createWebhookEvent(input: {
    userId: number | null;
    providerEventId: string;
    eventType: string;
    status: string;
    amount: number | null;
    currency: string | null;
    rawJson: object;
  }): Promise<void> {
    await prisma.paymentEvent.create({
      data: {
        userId: input.userId,
        provider: "portone",
        providerEventId: input.providerEventId,
        eventType: input.eventType,
        status: input.status,
        amount: input.amount,
        currency: input.currency,
        rawJson: input.rawJson
      }
    });
  }

  async applyEntitlementAndCreateConfirmEvent(input: {
    userId: number;
    paymentId: string;
    billingKey: string;
    nextProUntil: Date;
    cycle: "monthly" | "yearly";
    applyPaidEntitlementOnce: (tx: {
      paymentEvent: { create(args: unknown): Promise<unknown> };
      user: { update(args: unknown): Promise<unknown> };
    }) => Promise<{ applied: boolean }>;
  }): Promise<{ applied: boolean }> {
    return prisma.$transaction(async (tx) => {
      const entitlement = await input.applyPaidEntitlementOnce({
        paymentEvent: tx.paymentEvent,
        user: tx.user
      });

      await tx.paymentEvent.create({
        data: {
          userId: input.userId,
          provider: "portone",
          providerEventId: `portone-confirm:${input.paymentId}`,
          eventType: "confirm.paid",
          status: "processed",
          rawJson: {
            cycle: input.cycle,
            paymentId: input.paymentId,
            billingKey: input.billingKey,
            scheduleId: null
          }
        }
      });
      return entitlement;
    });
  }

  async applyEntitlementInWebhook(input: {
    userId: number;
    paymentId: string;
    billingKey: string;
    nextProUntil: Date;
    subscriptionStatus: "active" | "canceled";
    applyPaidEntitlementOnce: (tx: {
      paymentEvent: { create(args: unknown): Promise<unknown> };
      user: { update(args: unknown): Promise<unknown> };
    }) => Promise<{ applied: boolean }>;
  }): Promise<{ applied: boolean }> {
    return prisma.$transaction(async (tx) =>
      input.applyPaidEntitlementOnce({
        paymentEvent: tx.paymentEvent,
        user: tx.user
      })
    );
  }
}
