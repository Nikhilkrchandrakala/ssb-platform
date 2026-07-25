import { getCurrentUser } from "@/server/auth";
import { requirePsychAdmin } from "@/server/psychAccess";
import AssessmentEditorView from "./AssessmentEditorView";

// Ported from psych_battery/src/pages/AssessmentEditor.tsx.
// Fullscreen route (no sidebar chrome) — lives outside the (shell) route
// group entirely, matching legacy's separate "Fullscreen Routes (No
// Sidebar)" block in App.tsx which mounted /admin/assessment/:id outside
// <Layout>.
export default async function AssessmentEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  requirePsychAdmin(user);
  const { id } = await params;

  return <AssessmentEditorView id={id} />;
}
