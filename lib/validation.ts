import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function parseJsonWithSchema<TSchema extends z.ZodTypeAny>(
  req: NextRequest,
  schema: TSchema
): Promise<
  | { ok: true; data: z.infer<TSchema> }
  | { ok: false; response: NextResponse<{ error: string; issues?: string[] }> }
> {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "body";
      return `${path}: ${issue.message}`;
    });
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid request body.", issues },
        { status: 400 }
      )
    };
  }
  return { ok: true, data: parsed.data };
}

export const zPositiveInt = z.coerce.number().int().positive();

