import { NextRequest, NextResponse } from "next/server";

import { addDays, BillingCycle, getCycleDays, getStripe, normalizeCycle } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

function inferCycleFromPriceId(priceId: string | null | undefined): BillingCycle | null {
  if (!priceId) return null;
  const monthly = process.env.STRIPE_PRICE_MONTHLY?.trim();
  const yearly = process.env.STRIPE_PRICE_YEARLY?.trim();
  if (monthly && priceId === monthly) return "monthly";
  if (yearly && priceId === yearly) return "yearly";
  return null;
}

async function markPro(userId: number, cycle: BillingCycle | null, subId?: string | null, status?: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { proUntil: true }
  });
  const base = user?.proUntil && user.proUntil.getTime() > Date.now() ? user.proUntil : new Date();
  const nextProUntil = cycle ? addDays(base, getCycleDays(cycle)) : addDays(base, 30);
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "PRO",
      proUntil: nextProUntil,
      ...(subId ? { stripeSubscriptionId: subId } : {}),
      ...(status ? { stripeSubscriptionStatus: status } : {})
    }
  });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing stripe signature." }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: `Invalid webhook signature: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 400 }
    );
  }

  const existing = await prisma.paymentEvent.findUnique({
    where: { providerEventId: event.id },
    select: { id: true }
  });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
  }

  let userId: number | null = null;
  let amount: number | null = null;
  let currency: string | null = null;
  let status = "received";

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadataCycle = normalizeCycle(session.metadata?.cycle);
      const metadataUserId = Number(session.metadata?.userId);
      const customerId = typeof session.customer === "string" ? session.customer : null;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
      amount = session.amount_total ?? null;
      currency = session.currency ?? null;

      if (Number.isFinite(metadataUserId) && metadataUserId > 0) {
        userId = Math.floor(metadataUserId);
      } else if (customerId) {
        const u = await prisma.user.findUnique({
          where: { stripeCustomerId: customerId },
          select: { id: true }
        });
        userId = u?.id ?? null;
      }

      if (userId) {
        await markPro(userId, metadataCycle, subscriptionId, "active");
      }
      status = "processed";
    } else if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
      const linePriceId =
        invoice.lines.data[0]?.price?.id ?? null;
      const cycle = inferCycleFromPriceId(linePriceId);
      amount = invoice.amount_paid ?? null;
      currency = invoice.currency ?? null;

      const u = await prisma.user.findFirst({
        where: {
          OR: [
            ...(customerId ? [{ stripeCustomerId: customerId }] : []),
            ...(subscriptionId ? [{ stripeSubscriptionId: subscriptionId }] : [])
          ]
        },
        select: { id: true }
      });
      userId = u?.id ?? null;
      if (userId) {
        await markPro(userId, cycle, subscriptionId, "active");
      }
      status = "processed";
    } else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : null;
      const subscriptionId = sub.id;
      const linePriceId = sub.items.data[0]?.price?.id ?? null;
      const cycle = inferCycleFromPriceId(linePriceId);
      const u = await prisma.user.findFirst({
        where: {
          OR: [
            ...(customerId ? [{ stripeCustomerId: customerId }] : []),
            { stripeSubscriptionId: subscriptionId }
          ]
        },
        select: { id: true, proUntil: true }
      });
      userId = u?.id ?? null;
      if (userId) {
        if (sub.status === "active" || sub.status === "trialing") {
          const periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : cycle
              ? addDays(new Date(), getCycleDays(cycle))
              : addDays(new Date(), 30);
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: "PRO",
              proUntil: periodEnd,
              stripeSubscriptionId: subscriptionId,
              stripeSubscriptionStatus: sub.status
            }
          });
        } else {
          await prisma.user.update({
            where: { id: userId },
            data: {
              stripeSubscriptionId: subscriptionId,
              stripeSubscriptionStatus: sub.status
            }
          });
        }
      }
      status = "processed";
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : null;
      const u = await prisma.user.findFirst({
        where: {
          OR: [
            ...(customerId ? [{ stripeCustomerId: customerId }] : []),
            { stripeSubscriptionId: sub.id }
          ]
        },
        select: { id: true }
      });
      userId = u?.id ?? null;
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: "FREE",
            proUntil: new Date(),
            stripeSubscriptionStatus: "canceled"
          }
        });
      }
      status = "processed";
    } else {
      status = "ignored";
    }

    await prisma.paymentEvent.create({
      data: {
        userId,
        provider: "stripe",
        providerEventId: event.id,
        eventType: event.type,
        status,
        amount,
        currency,
        rawJson: event as unknown as object
      }
    });

    return NextResponse.json({ ok: true, status }, { status: 200 });
  } catch (error) {
    await prisma.paymentEvent.create({
      data: {
        userId,
        provider: "stripe",
        providerEventId: event.id,
        eventType: event.type,
        status: "error",
        amount,
        currency,
        rawJson: {
          event,
          error: error instanceof Error ? error.message : String(error)
        } as object
      }
    });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
