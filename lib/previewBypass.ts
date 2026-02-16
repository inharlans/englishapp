export const PREVIEW_BYPASS_COOKIE = "preview_bypass";
export const PREVIEW_BYPASS_TTL_SECONDS = 60 * 60;

export function isPreviewBypassAllowed(): boolean {
  return Boolean(process.env.PREVIEW_BYPASS_TOKEN?.trim());
}

