// Slot.startTime is only ever set to midnight UTC of the chosen calendar
// date (see admin/Courses' batch form: `new Date(startDate).toISOString()`
// from a plain <input type="date">) — it never carries a real time of day.
// Per owner decision (2026-08-04): a batch's *real* start clock-time is
// fixed by session type rather than admin-entered, so every Morning batch
// starts 7:30 AM IST and every Evening batch starts 7:30 PM IST, on
// whatever calendar date Slot.startTime encodes. This lets every consumer
// derive the real start time (and the "closes 1 hour before" cutoff) purely
// from existing data — no DB migration/backfill needed.
// Evening corrected from 5:00 PM to 7:30 PM (2026-08-14) to match the site's
// own published day-by-day schedule (src/util/data.ts's "evening" block,
// every session listed as "7:30 - 11:00 PM") — 5:00 PM was never correct.
const IST_OFFSET_HOURS = 5;
const IST_OFFSET_MINUTES = 30;

export const MORNING_START_IST = { hour: 7, minute: 30 };
export const EVENING_START_IST = { hour: 19, minute: 30 };

export const BOOKING_CUTOFF_MS_BEFORE_START = 60 * 60 * 1000; // 1 hour

export const BATCH_DURATION_DAYS = 12;

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

/**
 * A batch runs for 12 consecutive calendar days in IST (Day 1 = start date, Day 12 = start date + 11 days).
 * Concludes at 23:59:59.999 IST on Day 12.
 */
export function getBatchEndTime(slot: BatchTimingSlot): Date | null {
  if (!slot.startTime) return null;
  const base = new Date(slot.startTime);
  if (Number.isNaN(base.getTime())) return null;

  return new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate() + (BATCH_DURATION_DAYS - 1),
      23 - IST_OFFSET_HOURS,
      59 - IST_OFFSET_MINUTES,
      59,
      999
    )
  );
}

/**
 * Returns true if the batch's 12-day duration has completely finished.
 */
export function hasBatchEnded(slot: BatchTimingSlot, now: number = Date.now()): boolean {
  const end = getBatchEndTime(slot);
  if (!end) return true;
  return now > end.getTime();
}

/**
 * 1-based calendar day index in IST:
 * - 0: upcoming (not yet started)
 * - 1 to 12: active day of the batch
 * - 13+: ended
 */
export function getBatchCurrentDay(slot: BatchTimingSlot, now: number = Date.now()): number | null {
  if (!slot.startTime) return null;
  const base = new Date(slot.startTime);
  if (Number.isNaN(base.getTime())) return null;

  const nowIST = new Date(now + (IST_OFFSET_HOURS * 60 + IST_OFFSET_MINUTES) * 60 * 1000);
  const nowMidnightUTC = Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate());
  const startMidnightUTC = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate());

  const diffMs = nowMidnightUTC - startMidnightUTC;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return 0;
  return diffDays + 1;
}

/**
 * True if the batch start cutoff has passed, but the 12-day duration has NOT ended.
 * Sales executives can perform late enrollment during this period.
 */
export function isLateEnrollmentActive(slot: BatchTimingSlot, now: number = Date.now()): boolean {
  if (!slot.startTime) return false;
  return isBookingClosed(slot, now) && !hasBatchEnded(slot, now);
}

/** Days remaining in the 12-day batch run (1 to 12). */
export function getBatchDaysRemaining(slot: BatchTimingSlot, now: number = Date.now()): number {
  const currentDay = getBatchCurrentDay(slot, now);
  if (!currentDay || currentDay <= 0) return BATCH_DURATION_DAYS;
  if (currentDay > BATCH_DURATION_DAYS) return 0;
  return BATCH_DURATION_DAYS - currentDay + 1;
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

/** "26 Oct 2026" — real start date without clock time, ideal for offline batches. */
export function formatRealStartDate(slot: BatchTimingSlot): string {
  const real = getRealStartTime(slot);
  if (!real) return "N/A";
  return real.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Returns the time remaining until a payment link expires (e.g. "4d 18h left", "2h 15m left", "Link Expired").
 */
export function formatLinkTimeRemaining(expiresAt?: string | Date | null, now: number = Date.now()): {
  text: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
} {
  if (!expiresAt) return { text: "No expiry", isExpired: false, isExpiringSoon: false };
  const expiryTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiryTime)) return { text: "No expiry", isExpired: false, isExpiringSoon: false };

  const msLeft = expiryTime - now;
  if (msLeft <= 0) {
    return { text: "Link Expired", isExpired: true, isExpiringSoon: false };
  }

  const totalMinutes = Math.floor(msLeft / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  let text = "";
  if (days > 0) {
    text = `${days}d ${hours}h left`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m left`;
  } else {
    text = `${minutes}m left`;
  }

  return {
    text,
    isExpired: false,
    isExpiringSoon: days === 0,
  };
}

/** Formats an expiry date for human-readable display (e.g. "08 Oct 2026, 4:52 PM"). */
export function formatLinkExpiryDateTime(expiresAt?: string | Date | null): string {
  if (!expiresAt) return "No expiry";
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return "No expiry";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

