import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import BlogsView from "./BlogsView";

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const user = await getCurrentUser();
  requireAdminPermission(user, "blogs");
  const { id } = await searchParams;
  return <BlogsView blogId={id} />;
}
