import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import TotalSalesView from "./TotalSalesView";

export default async function TotalSalesPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "sales");
  // Org-wide revenue figures aren't for junior sales staff — only heads/owner
  // (and non-sales admins with the "sales" permission) can see this report.
  if ((user as { salesRole?: string } | null)?.salesRole === "executive") {
    redirect("/admin/Sales");
  }
  return <TotalSalesView />;
}
