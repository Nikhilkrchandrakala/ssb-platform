import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import DashboardView from "./DashboardView";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "dashboard");
  return <DashboardView />;
}
