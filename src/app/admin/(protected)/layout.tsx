import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { ADMIN_PANEL_ROLES, type AdminLikeUser } from "@/server/adminAccess";
import { AdminUserProvider, type AdminUser } from "@/components/admin/AdminUserProvider";
import AdminShell from "@/components/admin/AdminShell";

// Coarse gate for every page under app/admin/(protected)/: must have an
// active session with an admin-panel role at all. Fine-grained per-module
// permission checks (requireAdminPermission) happen in each page itself.
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const user = (await getCurrentUser()) as (AdminLikeUser & AdminUser) | null;
  if (!user || !ADMIN_PANEL_ROLES.includes(user.role || "")) {
    redirect("/admin");
  }

  return (
    <AdminUserProvider initialUser={user}>
      <AdminShell>{children}</AdminShell>
    </AdminUserProvider>
  );
}
