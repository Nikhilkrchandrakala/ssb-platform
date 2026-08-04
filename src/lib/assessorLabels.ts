export const ASSESSOR_TYPE_VALUES = ["Psych", "IO", "GTO", "TO"] as const;
export type AssessorType = (typeof ASSESSOR_TYPE_VALUES)[number];

// Real-world SSB designations these abbreviations stand for. Single source
// of truth — every UI surface (admin Profile/nav badge, RolesManagement,
// StudentRoster, Allotment, the psych-battery module, the student
// dashboard) previously had its own copy of this map, and they'd drifted:
// "GTO" was left un-expanded in some places while its siblings were spelled
// out, and label wording/format varied surface to surface.
export const ASSESSOR_FULL_NAME: Record<AssessorType, string> = {
  Psych: "Psychologist",
  IO: "Interviewing Officer",
  GTO: "Group Testing Officer",
  TO: "Technical Officer",
};

/** "Psychologist(Psych)" / "Interviewing Officer(IO)" / "Group Testing Officer(GTO)" / "Technical Officer(TO)" */
export function assessorLabel(type: string | null | undefined): string {
  if (!type) return "";
  const full = ASSESSOR_FULL_NAME[type as AssessorType];
  return full ? `${full}(${type})` : type;
}
