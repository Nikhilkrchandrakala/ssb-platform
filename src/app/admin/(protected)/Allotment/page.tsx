import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import AllotmentView from "./AllotmentView";

export default async function AllotmentPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "allotment");
  return <AllotmentView />;
}
