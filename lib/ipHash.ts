import { createHash } from "crypto";

export function hashIpForAudit(ip: string): string {
  const salt = process.env.AUTH_SECRET ?? "local-dev-salt";
  return createHash("sha256")
    .update(`${salt}:${ip}`)
    .digest("hex")
    .slice(0, 24);
}

