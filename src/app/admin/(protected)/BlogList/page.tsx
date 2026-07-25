import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import BlogListView from "./BlogListView";

export default async function BlogListPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "blogs");
  return <BlogListView />;
}
