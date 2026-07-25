import { getCurrentUser } from "@/server/auth";
import { requirePsychUser } from "@/server/psychAccess";
import AssessmentAdminPreviewView from "./AssessmentAdminPreviewView";

// Fullscreen route — outside the (shell) route group, matching legacy's
// separate "Fullscreen Routes (No Sidebar)" block in App.tsx:
//   <Route path="/presentation/:id" element={<div className="h-screen w-screen"><AssessmentAdminPreview /></div>} />
// Bare ProtectedRoute in legacy: any logged-in student/assessor/admin/owner.
export default async function PresentationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  requirePsychUser(user);
  // Resolving the param here (rather than only inside the client view via
  // useParams()) keeps this page a real server gate — the view still reads
  // its own id via useParams() to stay a faithful, self-contained port of
  // legacy's <AssessmentAdminPreview /> (no props), matching how it's called below.
  await params;
  return (
    <div className="h-screen w-screen">
      <AssessmentAdminPreviewView />
    </div>
  );
}
