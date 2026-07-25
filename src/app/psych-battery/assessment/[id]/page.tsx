import { getCurrentUser } from "@/server/auth";
import { requirePsychUser } from "@/server/psychAccess";
import AssessmentEngineView from "./AssessmentEngineView";

// Fullscreen route — outside the (shell) route group, matching legacy's
// separate "Fullscreen Routes (No Sidebar)" block in App.tsx. Bare
// ProtectedRoute in legacy: any logged-in student/assessor/admin/owner.
export default async function AssessmentEnginePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  requirePsychUser(user);
  const { id } = await params;
  return <AssessmentEngineView id={id} />;
}
