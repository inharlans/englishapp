import { NextRequest, NextResponse } from "next/server";

import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { PaymentsService } from "@/server/domain/payments/service";

const paymentsService = new PaymentsService();

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const payload = await req.text();
    const result = await paymentsService.processWebhook({
      payload,
      headers: {
        webhookId: req.headers.get("webhook-id") ?? "",
        webhookSignature: req.headers.get("webhook-signature") ?? "",
        webhookTimestamp: req.headers.get("webhook-timestamp") ?? ""
      }
    });

    await recordApiMetricFromStart({
      route: "/api/payments/webhook",
      method: "POST",
      status: result.status,
      startedAt,
      userId: result.metricUserId ?? null
    });

    return result.ok
      ? NextResponse.json(result.payload, { status: result.status })
      : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (error) {
    await captureAppError({
      route: "/api/payments/webhook",
      message: "portone_webhook_route_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) }
    });
    await recordApiMetricFromStart({
      route: "/api/payments/webhook",
      method: "POST",
      status: 500,
      startedAt
    });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
