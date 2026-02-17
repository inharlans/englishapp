import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [rawMetrics, recentErrors] = await Promise.all([
    prisma.apiRequestMetric.findMany({
      where: { createdAt: { gte: since } },
      select: { route: true, status: true, latencyMs: true }
    }),
    prisma.appErrorEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        level: true,
        route: true,
        message: true,
        createdAt: true
      }
    })
  ]);

  const byRoute = new Map<
    string,
    { route: string; total: number; status4xx: number; status5xx: number; latencySum: number; p95Latency: number }
  >();
  const latencyByRoute = new Map<string, number[]>();

  for (const m of rawMetrics) {
    const key = m.route;
    const prev = byRoute.get(key) ?? {
      route: key,
      total: 0,
      status4xx: 0,
      status5xx: 0,
      latencySum: 0,
      p95Latency: 0
    };
    prev.total += 1;
    if (m.status >= 400 && m.status < 500) prev.status4xx += 1;
    if (m.status >= 500) prev.status5xx += 1;
    prev.latencySum += m.latencyMs;
    byRoute.set(key, prev);

    const arr = latencyByRoute.get(key) ?? [];
    arr.push(m.latencyMs);
    latencyByRoute.set(key, arr);
  }

  const routeStats = Array.from(byRoute.values()).map((s) => {
    const arr = (latencyByRoute.get(s.route) ?? []).sort((a, b) => a - b);
    const p95Index = arr.length ? Math.floor(arr.length * 0.95) : 0;
    const p95 = arr.length ? arr[Math.min(p95Index, arr.length - 1)] : 0;
    return {
      route: s.route,
      total: s.total,
      status4xx: s.status4xx,
      status5xx: s.status5xx,
      avgLatencyMs: s.total ? Math.round(s.latencySum / s.total) : 0,
      p95LatencyMs: p95
    };
  });

  routeStats.sort((a, b) => b.total - a.total);

  return NextResponse.json(
    {
      since: since.toISOString(),
      routeStats,
      recentErrors: recentErrors.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString()
      }))
    },
    { status: 200 }
  );
}
