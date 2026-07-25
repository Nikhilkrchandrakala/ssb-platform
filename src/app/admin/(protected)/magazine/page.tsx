import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import MagazineView from "./MagazineView";

export default async function MagazinePage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "magazine");
  return <MagazineView />;
}
