import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { ADMIN_PANEL_ROLES } from "@/server/adminAccess";

// /admin no longer has its own login form — /SignIn (src/app/(site)/SignIn)
// now authenticates every account type (student, assessor, admin, owner,
// franchise) and routes each to the right place post-login. This route just
// forwards an already-authenticated staff session to its dashboard, or an
// unauthenticated visitor to the one shared sign-in page.
export default async function AdminGatewayPage() {
  const user = await getCurrentUser();
  if (user && ADMIN_PANEL_ROLES.includes(user.role as string)) {
    redirect(user.role === "franchise" ? "/admin/FranchiseDashboard" : "/admin/Profile");
  }

  redirect("/SignIn");
}
