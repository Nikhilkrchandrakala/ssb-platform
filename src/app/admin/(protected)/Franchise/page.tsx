import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import FranchiseView from "./FranchiseView";

export default async function FranchisePage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "franchise");
  return <FranchiseView />;
}
