export interface InternalCronResult {
  ok: true;
  status: 200;
  payload: Record<string, unknown>;
}

export type InternalCronServiceResult =
  | InternalCronResult
  | {
      ok: false;
      status: 403 | 500;
      error: string;
    };
