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

export function serviceResultToJson<T>(result: ServiceOk<T> | ServiceFail) {
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.payload, { status: result.status });
}
