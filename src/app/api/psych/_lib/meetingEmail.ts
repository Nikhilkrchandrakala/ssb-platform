import {
  sendPsychInterviewCandidateEmail,
  sendPsychInterviewAssessorEmail,
  sendIoInterviewAssessorEmail,
  sendInterviewCandidateEmail,
} from "@/server/integrations/msg91";
import { assessorLabel } from "@/lib/assessorLabels";

export type MeetingRole = "psych" | "gto" | "io" | "to";

// Was 2 separately-drifted copies of this map ("gto" left abbreviated while
// its siblings were spelled out in one; all inconsistently worded in the
// other) — both now derive from the single canonical assessorLabel() source.
const ROLE_LABELS: Record<MeetingRole, string> = {
  psych: `${assessorLabel("Psych")} Feedback`,
  gto: `${assessorLabel("GTO")} Outdoor Case`,
  io: `${assessorLabel("IO")} Interview`,
  to: `${assessorLabel("TO")} Aptitude`,
};

const ASSESSOR_ROLE_NAMES: Record<MeetingRole, string> = {
  psych: assessorLabel("Psych"),
  to: assessorLabel("TO"),
  gto: assessorLabel("GTO"),
  io: assessorLabel("IO"),
};

export interface MeetingEmailResults {
  candidateDelivered: boolean | null;
  assessorDelivered: boolean | null;
}

/**
 * Sends the candidate + assessor meeting-scheduled/cancelled emails via
 * MSG91 (src/server/integrations/msg91.ts — migrated 2026-08-05 off the
 * legacy `_lib/email.ts` wrapper, which swallowed every error internally and
 * never reported delivery status), matching legacy's per-role template
 * selection exactly: psych/to send 'psych_interview_candidate' +
 * 'psych_interview_assessor'; io sends 'interview_template_6' (candidate) +
 * 'io_interview_template' (assessor); everything else (gto) sends a single
 * combined 'interview_template_6' to both candidate and assessor.
 */
export async function sendMeetingEmails(params: {
  role: MeetingRole;
  studentEmail: string;
  studentName: string;
  assessorEmail: string;
  assessorName: string;
  meetingLink: string | null | undefined;
  formattedDate: string;
  formattedTime: string;
}): Promise<MeetingEmailResults> {
  const { role, studentEmail, studentName, assessorEmail, meetingLink, formattedDate, formattedTime } = params;
  const assessorName = params.assessorName || "Assessor";
  const roleLabel = ROLE_LABELS[role];
  const assessorRoleName = ASSESSOR_ROLE_NAMES[role];
  const link = meetingLink || "#";

  if (role === "psych" || role === "to") {
    const candidateResult = await sendPsychInterviewCandidateEmail({
      to: studentEmail,
      candidateName: studentName,
      assessorName,
      assessorRole: assessorRoleName,
      date: formattedDate,
      time: formattedTime,
      meetingLink: link,
    });

    let assessorDelivered: boolean | null = null;
    if (assessorEmail) {
      const result = await sendPsychInterviewAssessorEmail({
        to: assessorEmail,
        candidateName: studentName,
        assessorName,
        assessorRole: assessorRoleName,
        date: formattedDate,
        time: formattedTime,
        meetingLink: link,
      });
      assessorDelivered = result.delivered;
    } else {
      console.warn(`[EMAIL WARNING] Assessor email is missing. Cannot send meeting email for ${role.toUpperCase()} Assessor.`);
    }

    return { candidateDelivered: candidateResult.delivered, assessorDelivered };
  }

  if (role === "io") {
    const candidateResult = await sendInterviewCandidateEmail({
      to: studentEmail,
      name: studentName,
      candidateName: studentName,
      interviewType: roleLabel,
      date: formattedDate,
      time: formattedTime,
      meetingLink: link,
    });

    let assessorDelivered: boolean | null = null;
    if (assessorEmail) {
      const result = await sendIoInterviewAssessorEmail({
        to: assessorEmail,
        candidateName: studentName,
        assessorName,
        assessorRole: assessorRoleName,
        date: formattedDate,
        time: formattedTime,
        meetingLink: link,
      });
      assessorDelivered = result.delivered;
    } else {
      console.warn("[EMAIL WARNING] Assessor email is missing. Cannot send meeting email for IO Assessor.");
    }

    return { candidateDelivered: candidateResult.delivered, assessorDelivered };
  }

  // Legacy template behavior for other roles (GTO) — one combined send,
  // separately to whichever of candidate/assessor have an email on file, so
  // one missing address doesn't block the other from being notified.
  const candidateResult = await sendInterviewCandidateEmail({
    to: studentEmail,
    name: studentName,
    candidateName: `${studentName} (${roleLabel})`,
    interviewType: roleLabel,
    date: formattedDate,
    time: formattedTime,
    meetingLink: link,
  });

  let assessorDelivered: boolean | null = null;
  if (assessorEmail) {
    const result = await sendInterviewCandidateEmail({
      to: assessorEmail,
      name: assessorName,
      candidateName: `${studentName} (${roleLabel})`,
      interviewType: roleLabel,
      date: formattedDate,
      time: formattedTime,
      meetingLink: link,
    });
    assessorDelivered = result.delivered;
  }

  return { candidateDelivered: candidateResult.delivered, assessorDelivered };
}
