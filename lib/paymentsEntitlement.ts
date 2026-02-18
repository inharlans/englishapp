import { Prisma } from "@prisma/client";

import { BillingCycle, addDays, getCycleDays } from "@/lib/payments";

export function entitlementEventId(paymentId: string): string {
  return `portone-paid:${paymentId}`;
}

export function computeNextProUntil(input: {
  now: Date;
  currentProUntil: Date | null;
  cycle: BillingCycle;
}): Date {
  const baseDate =
    input.currentProUntil && input.currentProUntil.getTime() > input.now.getTime()
      ? input.currentProUntil
      : input.now;
  return addDays(baseDate, getCycleDays(input.cycle));
}

export function computeNextScheduleAt(nextProUntil: Date): Date {
  return nextProUntil;
}

export async function applyPaidEntitlementOnce(
  tx: {
    paymentEvent: {
      create(args: unknown): Promise<unknown>;
    };
    user: {
      update(args: unknown): Promise<unknown>;
    };
  },
  input: {
    userId: number;
    paymentId: string;
    billingKey: string;
    nextProUntil: Date;
    nextScheduleId?: string | null;
    subscriptionStatus?: "active" | "canceled";
    source: "confirm" | "webhook";
  }
): Promise<{ applied: boolean }> {
  try {
    await tx.paymentEvent.create({
      data: {
        userId: input.userId,
        provider: "portone",
        providerEventId: entitlementEventId(input.paymentId),
        eventType: "entitlement.applied",
        status: input.source,
        rawJson: {
          paymentId: input.paymentId,
          source: input.source
        }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { applied: false };
    }
    throw error;
  }

  await tx.user.update({
    where: { id: input.userId },
    data: {
      plan: "PRO",
      proUntil: input.nextProUntil,
      stripeCustomerId: input.billingKey,
      stripeSubscriptionStatus: input.subscriptionStatus ?? "active",
      ...(input.nextScheduleId !== undefined ? { stripeSubscriptionId: input.nextScheduleId } : {})
    }
  });

  return { applied: true };
}
