export const CLIENT_METRIC_NAMES = ["metric.home_cta_click", "metric.recap_next_action_click"] as const;

export type ClientMetricName = (typeof CLIENT_METRIC_NAMES)[number];
