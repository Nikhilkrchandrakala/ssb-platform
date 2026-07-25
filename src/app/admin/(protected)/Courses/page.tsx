import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import CoursesView from "./CoursesView";

export default async function CoursesPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "courses");
  return <CoursesView />;
}
