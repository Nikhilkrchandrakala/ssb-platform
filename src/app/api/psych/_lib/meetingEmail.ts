import { sendMsg91Email } from "./email";
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

/**
 * Sends the candidate + assessor meeting-scheduled/cancelled emails via
 * MSG91, matching legacy's per-role template selection exactly: psych/to
 * send 'psych_interview_candidate' + 'psych_interview_assessor'; io sends
 * 'interview_template_6' (candidate) + 'io_interview_template' (assessor);
 * everything else (gto) sends a single combined 'interview_template_6' to
 * both candidate and assessor.
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
}): Promise<void> {
  const { role, studentEmail, studentName, assessorEmail, meetingLink, formattedDate, formattedTime } = params;
  const assessorName = params.assessorName || "Assessor";
  const roleLabel = ROLE_LABELS[role];
  const assessorRoleName = ASSESSOR_ROLE_NAMES[role];

  if (role === "psych" || role === "to") {
    await sendMsg91Email(
      {
        to: [{ name: studentName, email: studentEmail }],
        templateId: "psych_interview_candidate",
        variables: {
          candidate_name: studentName,
          assessor_name: assessorName,
          assessor_role: assessorRoleName,
          date: formattedDate,
          time: formattedTime,
          meeting_link: meetingLink || "#",
        },
      },
      "Candidate"
    );

    if (assessorEmail) {
      await sendMsg91Email(
        {
          to: [{ name: assessorName, email: assessorEmail }],
          templateId: "psych_interview_assessor",
          variables: {
            candidate_name: studentName,
            assessor_name: assessorName,
            assessor_role: assessorRoleName,
            date: formattedDate,
            time: formattedTime,
            meeting_link: meetingLink || "#",
          },
        },
        "Assessor"
      );
    } else {
      console.warn(`[EMAIL WARNING] Assessor email is missing. Cannot send meeting email for ${role.toUpperCase()} Assessor.`);
    }
  } else if (role === "io") {
    await sendMsg91Email(
      {
        to: [{ name: studentName, email: studentEmail }],
        templateId: "interview_template_6",
        variables: {
          candidate_name: studentName,
          interview_type: roleLabel,
          date: formattedDate,
          time: formattedTime,
          meeting_link: meetingLink || "#",
        },
      },
      "Candidate"
    );

    if (assessorEmail) {
      await sendMsg91Email(
        {
          to: [{ name: assessorName, email: assessorEmail }],
          templateId: "io_interview_template",
          variables: {
            candidate_name: studentName,
            assessor_name: assessorName,
            assessor_role: assessorRoleName,
            date: formattedDate,
            time: formattedTime,
            meeting_link: meetingLink || "#",
          },
        },
        "Assessor"
      );
    } else {
      console.warn("[EMAIL WARNING] Assessor email is missing. Cannot send meeting email for IO Assessor.");
    }
  } else {
    // Legacy template behavior for other roles (GTO) — combined send to both.
    const recipients = [{ name: studentName, email: studentEmail }];
    if (assessorEmail) recipients.push({ name: assessorName, email: assessorEmail });

    await sendMsg91Email(
      {
        to: recipients,
        templateId: "interview_template_6",
        variables: {
          candidate_name: `${studentName} (${roleLabel})`,
          interview_type: roleLabel,
          date: formattedDate,
          time: formattedTime,
          meeting_link: meetingLink || "#",
        },
      },
      "Combined-Legacy"
    );
  }
}
