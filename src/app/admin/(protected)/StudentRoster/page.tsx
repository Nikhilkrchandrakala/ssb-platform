import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import StudentRosterView from "./StudentRosterView";

export default async function StudentRosterPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "students");
  return <StudentRosterView />;
}
