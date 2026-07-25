import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import CandidateView from "./CandidateView";

export default async function CandidatePage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "candidates");
  return <CandidateView />;
}
