import { cookies } from "next/headers";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { maskEmailAddress } from "@/lib/textQuality";
import { AdminUsersClient } from "./usersClient";

export default async function AdminPage() {
  const user = await getUserFromRequestCookies(await cookies());
  if (!user || !user.isAdmin) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">{"\uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4"}</h1>
      </section>
    );
  }

  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: { id: true, email: true, isAdmin: true, plan: true, proUntil: true, createdAt: true }
  });

  return (
    <AdminUsersClient
      initialUsers={users.map((u) => ({
        ...u,
        email: maskEmailAddress(u.email),
        proUntil: u.proUntil ? u.proUntil.toISOString() : null,
        createdAt: u.createdAt.toISOString()
      }))}
    />
  );
}
