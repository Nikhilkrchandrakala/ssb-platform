import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import TotalSalesView from "./TotalSalesView";

export default async function TotalSalesPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "sales");
  return <TotalSalesView />;
}
