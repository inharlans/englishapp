export const CLIENT_METRIC_NAMES = [
  "metric.home_cta_click",
  "metric.recap_next_action_impression",
  "metric.recap_next_action_click",
  "metric.wordbook_list_summary_impression",
  "metric.wordbook_list_summary_click"
] as const;

export type ClientMetricName = (typeof CLIENT_METRIC_NAMES)[number];
