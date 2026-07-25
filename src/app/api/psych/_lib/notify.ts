import { User } from "@/server/models/User";
import { AdminUser } from "@/server/models/AdminUser";
import { Notification } from "@/server/models/Notification";

interface StudentLike {
  _id?: unknown;
  assignedIO?: unknown;
  assignedTO?: unknown;
  assignedPsych?: unknown;
}

/**
 * Legacy psych_battery notified, on dossier/PIQ upload and evaluation
 * completion: the student's assigned IO/TO/Psych assessors, every plain
 * `User` with role 'admin', and every `AdminUser` that is 'owner' or holds
 * the evaluations/super_admin/psych_battery permission. Ported verbatim.
 */
export async function getEvaluationRecipientIds(student: StudentLike | null): Promise<string[]> {
  const recipientIds: string[] = [];
  if (student) {
    if (student.assignedIO) recipientIds.push(String(student.assignedIO));
    if (student.assignedTO) recipientIds.push(String(student.assignedTO));
    if (student.assignedPsych) recipientIds.push(String(student.assignedPsych));
  }

  const admins = await User.find({ role: "admin" });
  for (const a of admins) {
    const id = String(a._id);
    if (!recipientIds.includes(id)) recipientIds.push(id);
  }

  const superAdmins = await AdminUser.find({
    $or: [{ role: "owner" }, { permissions: { $in: ["evaluations", "super_admin", "psych_battery"] } }],
  });
  for (const sa of superAdmins) {
    const id = String(sa._id);
    if (!recipientIds.includes(id)) recipientIds.push(id);
  }

  return recipientIds;
}

export async function notifyRecipients(
  recipientIds: string[],
  data: { studentId: unknown; submissionId: unknown; title: string; message: string }
): Promise<void> {
  for (const recipientId of new Set(recipientIds)) {
    const notification = new Notification({
      recipientId,
      studentId: data.studentId,
      submissionId: data.submissionId,
      title: data.title,
      message: data.message,
      isRead: false,
    });
    await notification.save();
  }
}
