import { getCurrentUser } from "@/server/auth";
import { requirePsychUser } from "@/server/psychAccess";
import SubmissionUploadView from "./SubmissionUploadView";

// Sidebar-shell route — legacy: <Route path="/upload/:id" element={<SubmissionUpload />} />
// nested under the bare <ProtectedRoute /> (any logged-in student/assessor/admin/owner).
export default async function SubmissionUploadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  requirePsychUser(user);
  const { id } = await params;
  return <SubmissionUploadView id={id} />;
}
