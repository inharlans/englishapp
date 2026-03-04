import { NextRequest } from "next/server";

import { handleMobileProviderCallback } from "@/lib/mobileCallbackBridge";

export async function GET(req: NextRequest) {
  return handleMobileProviderCallback(req, "naver");
}
