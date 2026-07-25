import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import RolesManagementView from "./RolesManagementView";

export default async function RolesManagementPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "roles");
  return <RolesManagementView />;
}
