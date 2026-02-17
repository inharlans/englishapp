import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { captureAppError, recordApiMetric } from "@/lib/observability";
import { getPriceId, getStripe, normalizeCycle } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { z } from "zod";

const checkoutSchema = z.object({
  cycle: z.enum(["monthly", "yearly"])
});

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const stripe = getStripe();
    if (!stripe) {
      const res = NextResponse.json({ error: "결제 설정이 아직 완료되지 않았습니다." }, { status: 503 });
      await recordApiMetric({
        route: "/api/payments/checkout",
        method: "POST",
        status: 503,
        latencyMs: Date.now() - startedAt,
        userId: user.id
      });
      return res;
    }

    const parsed = await parseJsonWithSchema(req, checkoutSchema);
    if (!parsed.ok) return parsed.response;
    const cycle = normalizeCycle(parsed.data.cycle);
    if (!cycle) return NextResponse.json({ error: "Invalid cycle." }, { status: 400 });
    const priceId = getPriceId(cycle);
    if (!priceId) {
      return NextResponse.json({ error: "선택한 요금제 가격 설정이 누락되었습니다." }, { status: 503 });
    }

    const successUrl = `${req.nextUrl.origin}/pricing?payment=success`;
    const cancelUrl = `${req.nextUrl.origin}/pricing?payment=cancel`;

    let customerId = null as string | null;
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeCustomerId: true, email: true }
    });
    if (dbUser?.stripeCustomerId) {
      customerId = dbUser.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: dbUser?.email ?? user.email,
        metadata: { userId: String(user.id) }
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id }
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: String(user.id),
        cycle
      }
    });

    const res = NextResponse.json({ url: session.url }, { status: 200 });
    await recordApiMetric({
      route: "/api/payments/checkout",
      method: "POST",
      status: 200,
      latencyMs: Date.now() - startedAt,
      userId: user.id
    });
    return res;
  } catch (error) {
    await captureAppError({
      level: "error",
      route: "/api/payments/checkout",
      message: "payment_checkout_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) },
      userId: user.id
    });
    await recordApiMetric({
      route: "/api/payments/checkout",
      method: "POST",
      status: 500,
      latencyMs: Date.now() - startedAt,
      userId: user.id
    });
    return NextResponse.json({ error: "결제 세션 생성에 실패했습니다." }, { status: 500 });
  }
}
