import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import LeadsView from "./LeadsView";

export default async function LeadsPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "leads");
  return <LeadsView />;
}
