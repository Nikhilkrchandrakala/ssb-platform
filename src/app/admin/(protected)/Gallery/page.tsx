import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import GalleryView from "./GalleryView";

export default async function GalleryPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "gallery");
  return <GalleryView />;
}
