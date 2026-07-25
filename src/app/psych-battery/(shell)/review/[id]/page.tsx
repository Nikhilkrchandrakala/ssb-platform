import { getCurrentUser } from "@/server/auth";
import { requirePsychAssessorOrAdmin } from "@/server/psychAccess";
import SubmissionReviewView from "./SubmissionReviewView";

type Params = { params: Promise<{ id: string }> };

export default async function SubmissionReviewPage({ params }: Params) {
  const { id } = await params; // Next 16 async params
  const user = await getCurrentUser();
  requirePsychAssessorOrAdmin(user);
  return <SubmissionReviewView submissionId={id} />;
}
