import { NextResponse } from "next/server";

import { MobileAuthError } from "@/lib/mobileAuthErrors";

export function mobileAuthErrorJson(error: MobileAuthError) {
  return NextResponse.json(
    {
      ok: false,
      errorCode: error.errorCode,
      message: error.message
    },
    { status: error.status }
  );
}
