import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { getStripe } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";

export async function POST(req: NextRequest) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "결제 설정이 아직 완료되지 않았습니다." }, { status: 503 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true }
  });
  if (!dbUser?.stripeCustomerId) {
    return NextResponse.json({ error: "연결된 결제 고객 정보가 없습니다." }, { status: 400 });
  }

  const returnUrl =
    process.env.STRIPE_PORTAL_RETURN_URL?.trim() || `${req.nextUrl.origin}/pricing`;
  const session = await stripe.billingPortal.sessions.create({
    customer: dbUser.stripeCustomerId,
    return_url: returnUrl
  });
  return NextResponse.json({ url: session.url }, { status: 200 });
}
