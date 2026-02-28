import { cookies } from "next/headers";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { AdminPageQueryService } from "@/server/domain/admin/page-query-service";
import { AdminUsersClient } from "./usersClient";

const adminPageQueryService = new AdminPageQueryService();

export default async function AdminPage() {
  const user = await getUserFromRequestCookies(await cookies());
  if (!user || !user.isAdmin) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">{"\uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4"}</h1>
      </section>
    );
  }

  const users = await adminPageQueryService.listUsersForPage();

  return (
    <AdminUsersClient initialUsers={users} />
  );
}
