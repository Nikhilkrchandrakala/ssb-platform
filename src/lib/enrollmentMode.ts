export type EnrollmentMode = "online" | "offline";

export const ENROLLMENT_MODE_OPTIONS: { value: EnrollmentMode; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
];

export const ENROLLMENT_MODE_LABELS: Record<EnrollmentMode, string> = {
  online: "Online",
  offline: "Offline",
};

// Records written before this field existed (or read through a `.lean()`
// query, which skips schema defaults) have no value stored — treat those as
// Online, since every student before this feature shipped was, in fact,
// online. Never surface anything but the two real values.
export function resolveEnrollmentMode(mode?: string | null): EnrollmentMode {
  return mode === "offline" ? "offline" : "online";
}
