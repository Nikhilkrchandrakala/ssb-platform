import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import FranchiseDashboardView from "./FranchiseDashboardView";

// FranchiseDashboard has no entry in the legacy PAGE_PERMISSIONS map — franchise
// accounts don't carry a `permissions` array at all, they're gated by role.
// So this page uses an inline role check instead of requireAdminPermission.
export default async function FranchiseDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "franchise") redirect("/admin/Profile");
  return <FranchiseDashboardView />;
}
