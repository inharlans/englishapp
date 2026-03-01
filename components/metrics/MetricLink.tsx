"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { sendClientMetric } from "@/lib/metrics/client";
import { type ClientMetricName } from "@/lib/metrics/names";

type MetricLinkProps = Omit<ComponentProps<typeof Link>, "onClick"> & {
    metricName: ClientMetricName;
    metricPayload: Record<string, unknown>;
    onClick?: ComponentProps<typeof Link>["onClick"];
  };

export function MetricLink({ metricName, metricPayload, onClick, ...props }: MetricLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (event.currentTarget.target && event.currentTarget.target !== "_self") return;
        sendClientMetric(metricName, metricPayload);
      }}
    />
  );
}
