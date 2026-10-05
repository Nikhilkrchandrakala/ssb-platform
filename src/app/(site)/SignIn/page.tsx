import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { ADMIN_PANEL_ROLES } from "@/server/adminAccess";
import { getAuthDisplaySettings } from "@/server/authDisplaySettings";
import SignInClient from "./SignInClient";

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) {
    if (ADMIN_PANEL_ROLES.includes(user.role as string)) {
      redirect(user.role === "franchise" ? "/admin/FranchiseDashboard" : "/admin/Profile");
    } else {
      redirect("/ProfileDashboard");
    }
  }

  const initialDisplaySettings = await getAuthDisplaySettings().catch(() => null);
  return <SignInClient initialDisplaySettings={initialDisplaySettings} />;
}
