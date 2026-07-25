import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import SalesDashboardView from "./SalesDashboardView";

export default async function SalesPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "sales");
  return <SalesDashboardView />;
}
