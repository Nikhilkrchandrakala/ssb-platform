import { getCurrentUser } from "@/server/auth";
import { requireAdminPermission } from "@/server/adminAccess";
import SoftSkillsEvaluationView from "./SoftSkillsEvaluationView";

export const metadata = {
  title: "Soft Skills Video Evaluations | SSB Admin",
};

export default async function SoftSkillsEvaluationPage() {
  const user = await getCurrentUser();
  requireAdminPermission(user, "softskills_evaluation");

  return <SoftSkillsEvaluationView />;
}
