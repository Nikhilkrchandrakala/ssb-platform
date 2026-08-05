import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import AllotmentSummaryView from "./AllotmentSummaryView";

export default async function AllotmentSummaryPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "allotment");
  return <AllotmentSummaryView />;
}
