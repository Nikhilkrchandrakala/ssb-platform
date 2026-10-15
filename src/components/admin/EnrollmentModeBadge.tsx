import { resolveEnrollmentMode, ENROLLMENT_MODE_LABELS } from "@/lib/enrollmentMode";

export default function EnrollmentModeBadge({
  mode,
  price,
  offlineStatus,
}: {
  mode?: string | null;
  price?: number | null;
  offlineStatus?: "full" | "deposit" | null;
}) {
  const resolved = resolveEnrollmentMode(mode);
  const isOnline = resolved === "online";
  const isOffline = resolved === "offline";

  const numPrice = typeof price === "number" ? price : undefined;
  const isFullPaid = offlineStatus === "full" || (numPrice !== undefined && numPrice >= 21000);
  const isDeposit = offlineStatus === "deposit" || (numPrice !== undefined && numPrice > 0 && numPrice < 21000);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
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
      {isOffline && isFullPaid && (
        <span
          className="badge bg-success"
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "3px 6px",
            letterSpacing: "0.3px",
          }}
          title="Candidate paid the full course fee (₹21,000) online"
        >
          Paid in Full
        </span>
      )}
      {isOffline && isDeposit && (
        <span
          className="badge bg-warning text-dark"
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "3px 6px",
            letterSpacing: "0.3px",
          }}
          title="Registration deposit paid. ₹16,000 balance due in person at campus."
        >
          ₹16,000 Due
        </span>
      )}
    </span>
  );
}

