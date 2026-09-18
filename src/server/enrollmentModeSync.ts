import { Order, User } from "@/server/models";

/**
 * Keeps `User.enrollmentMode` in sync with the mode of the student's MOST
 * RECENT paid Order (via that order's Slot). `enrollmentMode` is read as a
 * single global flag by StudentRoster, all-users, Sales, TotalSales, and
 * FranchiseDashboard — without this, a student who buys an offline batch and
 * later an online one (or vice versa) keeps showing the wrong badge on every
 * one of those pages forever, since neither verifyPayment.ts nor
 * manualBookSlot ever used to touch this field on a second purchase.
 *
 * Call this after any new paid Order is created for a user (checkout
 * verification, manual booking, offline registration, etc).
 */
export async function syncEnrollmentModeForUser(userId: string): Promise<void> {
  const mostRecentPaidOrder = await Order.findOne({ userId, status: "paid" })
    .sort({ createdAt: -1 })
    .populate("slotId", "mode");
  if (!mostRecentPaidOrder) return;

  const slot = mostRecentPaidOrder.slotId as unknown as { mode?: string } | null;
  const mode = slot?.mode === "offline" ? "offline" : "online";
  await User.findByIdAndUpdate(userId, { enrollmentMode: mode });
}
