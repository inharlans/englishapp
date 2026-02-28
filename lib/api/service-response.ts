import { NextResponse } from "next/server";

type ServiceOk<T> = {
  ok: true;
  status: number;
  payload: T;
};

type ServiceFail = {
  ok: false;
  status: number;
  error: string;
};

export function errorJson(params: {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  headers?: Record<string, string>;
}) {
  const body: {
    ok: false;
    code: string;
    message: string;
    error: string;
    details?: Record<string, unknown>;
  } = {
    ok: false,
    code: params.code,
    message: params.message,
    error: params.message
  };
  if (params.details && Object.keys(params.details).length > 0) {
    body.details = params.details;
  }
  return NextResponse.json(body, {
    status: params.status,
    headers: params.headers
  });
}

export function unauthorizedJson(message = "Unauthorized.") {
  return errorJson({
    status: 401,
    code: "UNAUTHORIZED",
    message
  });
}

export function serviceResultToJson<T>(result: ServiceOk<T> | ServiceFail) {
  if (!result.ok) {
    return errorJson({
      status: result.status,
      code: "REQUEST_FAILED",
      message: result.error
    });
  }
  return NextResponse.json(result.payload, { status: result.status });
}
