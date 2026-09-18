import { resolveEnrollmentMode, ENROLLMENT_MODE_LABELS } from "@/lib/enrollmentMode";

export default function EnrollmentModeBadge({ mode }: { mode?: string | null }) {
  const resolved = resolveEnrollmentMode(mode);
  const isOnline = resolved === "online";
  return (
    <span
      className="badge"
      style={{
        background: isOnline ? "rgba(52,152,219,0.15)" : "rgba(230,126,34,0.15)",
        color: isOnline ? "#3498db" : "#e67e22",
        border: `1px solid ${isOnline ? "rgba(52,152,219,0.3)" : "rgba(230,126,34,0.3)"}`,
        padding: "3px 8px",
        borderRadius: 4,
        fontSize: "0.72rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.3px",
        display: "inline-block",
      }}
    >
      {ENROLLMENT_MODE_LABELS[resolved]}
    </span>
  );
}
