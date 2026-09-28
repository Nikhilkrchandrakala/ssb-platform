import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import BatchLeadsView from "@/components/admin/BatchLeadsView";

export default async function OfflineBatchPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "leads");
  return <BatchLeadsView batchType="offline" />;
}
