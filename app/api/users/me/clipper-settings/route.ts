import { NextRequest } from "next/server";
import { z } from "zod";

import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { serviceResultToJson } from "@/lib/api/service-response";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { ClipperService } from "@/server/domain/clipper/service";

const patchBodySchema = z.object({
  defaultWordbookId: z.number().int().positive().nullable()
});

const clipperService = new ClipperService();

export async function GET(req: NextRequest) {
  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;

  const result = await clipperService.getSettings(auth.user);
  return serviceResultToJson(result);
}

export async function PATCH(req: NextRequest) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonWithSchema(req, patchBodySchema);
  if (!parsed.ok) return parsed.response;

  const result = await clipperService.updateSettings(auth.user, parsed.data.defaultWordbookId);
  return serviceResultToJson(result);
}
