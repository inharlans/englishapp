import { cookies } from "next/headers";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { AdminUsersClient } from "./usersClient";

export default async function AdminPage() {
  const user = await getUserFromRequestCookies(await cookies());
  if (!user || !user.isAdmin) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Not found</h1>
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
        proUntil: u.proUntil ? u.proUntil.toISOString() : null,
        createdAt: u.createdAt.toISOString()
      }))}
    />
  );
}

