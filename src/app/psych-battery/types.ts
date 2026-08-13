// Ported as-is from psych_battery/src/types.ts.

export type UserRole = "student" | "assessor" | "admin" | "owner";

export interface UserProfile {
  id?: string;
  _id?: string;
  uid?: string;
  name: string;
  email: string;
  role: UserRole;
  profileImage?: string;
  piqUrl?: string;
  assignedAssessor?: string;
  assessorType?: "GTO" | "TO" | "Psych" | "IO" | null;
  clinicalStage?: string;
  chestNo?: string;
  batch?: string;
  assignedGTO?: string | null;
  assignedTO?: string | null;
  assignedPsych?: string | null;
  assignedIO?: string | null;
  createdAt: unknown;
}

export type SlideType = "IMAGE" | "WORD" | "TEXT" | "BLACKOUT" | "BREAK";

export type ModuleId = "INTRO" | "TAT" | "WAT" | "SRT_INST" | "SRT" | "SDT_INST" | "SDT" | "CLOSING";

export interface ModuleConfig {
  timingMode: "per-slide" | "global";
  globalDuration: number; // seconds, only used when timingMode='global'
  navigable: boolean;
}

export interface Assessment {
  id?: string;
  _id?: string;
  title: string;
  description: string;
  type: "TAT" | "WAT" | "SRT" | "SDT" | "GENERAL";
  instructions: string;
  duration: number;
  active: boolean;
  allowCandidateSkip?: boolean;
  createdBy: string;
  createdAt: unknown;
  modules?: Record<ModuleId, ModuleConfig>;
}

export interface AssessmentSlide {
  id: string;
  assessmentId: string;
  module: ModuleId;
  slideType: SlideType;
  imageUrl?: string;
  content?: string; // Used for words, situations, or instructions
  displayTime: number; // in seconds
  order: number;
  typographyScale?: number; // scale multiplier for text sizing (default 1)
  lineHeight?: number; // multiplier for text line height (default 1.6)
  inverted?: boolean; // whether to invert colors on the slide
  isInstruction?: boolean;
}

export type SubmissionStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "PENDING_UPLOAD"
  | "UPLOADED"
  | "ASSIGNED"
  | "UNDER_REVIEW"
  | "MEETING_SCHEDULED"
  | "REPORT_PENDING"
  | "COMPLETED"
  | "REVIEW_PENDING"
  | "TEST_COMPLETED"
  | "REPORT_RELEASED"
  | "PENDING";

export interface AssessmentSubmission {
  id?: string;
  _id?: string;
  userId?: unknown; // Populated by mongoose
  student?: unknown; // Populated by mongoose
  assessmentId: string | Assessment;
  status: SubmissionStatus;
  startedAt?: unknown;
  completedAt?: unknown;
  uploadedFiles?: string[];
  piqFiles?: string[];
  piq1Status?: string;
  piq2Status?: string;
  piq1UploadedAt?: unknown;
  piq2UploadedAt?: unknown;
  dossierUploadedAt?: unknown;
  assessorId?: string;
  assessorRemarks?: string;
  psychStatus?: string;
  psychRemarks?: string;
  evaluation?: string;
  scores?: Record<string, number>;
  score?: number;
  meetingDate?: unknown;
  meetingLink?: string;
  psychMeetingDate?: unknown;
  psychMeetingLink?: string;
  ioMeetingDate?: unknown;
  ioMeetingLink?: string;
  gtoMeetingDate?: unknown;
  gtoMeetingLink?: string;
  toMeetingDate?: unknown;
  toMeetingLink?: string;
  finalReport?: string;
  releasedPsychRemarks?: string;
  releasedGtoRemarks?: string;
  releasedIoRemarks?: string;
  releasedToRemarks?: string;
  reportVisibility?: {
    psych?: boolean;
    io?: boolean;
    gto?: boolean;
    to?: boolean;
  };
  reviewedAt?: unknown;
  createdAt?: unknown;
}

export interface AssessorNote {
  id: string;
  submissionId: string;
  assessorId: string;
  notes: string;
  createdAt: unknown;
}
