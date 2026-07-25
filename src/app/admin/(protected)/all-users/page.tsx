import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import AllUsersView from "./AllUsersView";

export default async function AllUsersPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "admin");
  return <AllUsersView />;
}
