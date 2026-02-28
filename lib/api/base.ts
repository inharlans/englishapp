export class ApiError extends Error {
  status: number;
  code?: string;
  source: string;

  constructor(input: { message: string; status: number; source: string; code?: string }) {
    super(input.message);
    this.name = "ApiError";
    this.status = input.status;
    this.source = input.source;
    this.code = input.code;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function parseApiResponse<T>(
  res: Response,
  fallbackMessage: string,
  source: string
): Promise<T> {
  let body: unknown = {};

  try {
    const text = await res.text();
    body = text ? (JSON.parse(text) as unknown) : {};
  } catch {
    body = {};
  }

  const message =
    isObject(body) && typeof body.error === "string" && body.error.trim().length > 0
      ? body.error
      : fallbackMessage;
  const code = isObject(body) && typeof body.code === "string" ? body.code : undefined;

  if (!res.ok) {
    throw new ApiError({
      message,
      status: res.status,
      source,
      code
    });
  }

  return body as T;
}
