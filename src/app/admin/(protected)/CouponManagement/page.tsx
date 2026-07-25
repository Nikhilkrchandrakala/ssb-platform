import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import CouponManagementView from "./CouponManagementView";

export default async function CouponManagementPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "coupons");
  return <CouponManagementView />;
}
