// Slot.startTime is only ever set to midnight UTC of the chosen calendar
// date (see admin/Courses' batch form: `new Date(startDate).toISOString()`
// from a plain <input type="date">) — it never carries a real time of day.
// Per owner decision (2026-08-04): a batch's *real* start clock-time is
// fixed by session type rather than admin-entered, so every Morning batch
// starts 7:30 AM IST and every Evening batch starts 5:00 PM IST, on
// whatever calendar date Slot.startTime encodes. This lets every consumer
// derive the real start time (and the "closes 1 hour before" cutoff) purely
// from existing data — no DB migration/backfill needed.
const IST_OFFSET_HOURS = 5;
const IST_OFFSET_MINUTES = 30;

export const MORNING_START_IST = { hour: 7, minute: 30 };
export const EVENING_START_IST = { hour: 17, minute: 0 };

export const BOOKING_CUTOFF_MS_BEFORE_START = 60 * 60 * 1000; // 1 hour

export interface BatchTimingSlot {
  startTime?: string | null;
  batchType?: string | null;
  title?: string | null;
}

export function isMorningBatch(slot: BatchTimingSlot): boolean {
  if (slot.batchType) return slot.batchType.toLowerCase() === "morning";
  return (slot.title || "").toLowerCase().includes("morning");
}

/** The batch's real start instant (its calendar date, at the fixed IST session time). */
export function getRealStartTime(slot: BatchTimingSlot): Date | null {
  if (!slot.startTime) return null;
  const base = new Date(slot.startTime);
  if (Number.isNaN(base.getTime())) return null;

  const { hour, minute } = isMorningBatch(slot) ? MORNING_START_IST : EVENING_START_IST;
  // Read the calendar date via UTC getters (not local getters) since
  // Slot.startTime was itself constructed as UTC midnight for that date —
  // using local getters here would shift the date depending on whichever
  // timezone this code happens to run in.
  return new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hour - IST_OFFSET_HOURS, minute - IST_OFFSET_MINUTES)
  );
}

/** Booking closes exactly 1 hour before the real start time. */
export function getBookingCutoff(slot: BatchTimingSlot): Date | null {
  const real = getRealStartTime(slot);
  if (!real) return null;
  return new Date(real.getTime() - BOOKING_CUTOFF_MS_BEFORE_START);
}

export function isBookingClosed(slot: BatchTimingSlot, now: number = Date.now()): boolean {
  const cutoff = getBookingCutoff(slot);
  if (!cutoff) return true;
  return now > cutoff.getTime();
}

/** "2d 4h left to book" / "45m left to book" / "Booking Closed". */
export function formatTimeRemaining(slot: BatchTimingSlot, now: number = Date.now()): string {
  const cutoff = getBookingCutoff(slot);
  if (!cutoff) return "Booking Closed";

  const msLeft = cutoff.getTime() - now;
  if (msLeft <= 0) return "Booking Closed";

  const totalMinutes = Math.floor(msLeft / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h left to book`;
  if (hours > 0) return `${hours}h ${minutes}m left to book`;
  return `${minutes}m left to book`;
}

/** "3 Aug 2026, 7:30 AM" — the real start time, for display. */
export function formatRealStartTime(slot: BatchTimingSlot): string {
  const real = getRealStartTime(slot);
  if (!real) return "N/A";
  return real.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}
