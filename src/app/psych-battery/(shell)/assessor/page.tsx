import { getCurrentUser } from "@/server/auth";
import { requirePsychAssessor } from "@/server/psychAccess";
import AssessorDashboardView from "./AssessorDashboardView";

export default async function AssessorPage() {
  const user = await getCurrentUser();
  requirePsychAssessor(user); // redirects to /psych-battery if role isn't "assessor" (or /SignIn if not logged in)
  return <AssessorDashboardView />;
}
