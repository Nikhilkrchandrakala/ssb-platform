import { Course, Coupon, User } from "@/server/models";

// Same offline-safe baseline as createOrder/manualBookSlot's global-pricing lookup.
const DEFAULT_PRICES: Record<string, number> = {
  ssb_ppdt: 1999,
  psych: 3499,
  interview: 2499,
  group_testing: 7999,
  full_course: 12499,
};

interface SlotLike {
  isFullCourse?: boolean;
  price?: number;
}

async function getCourseModulePrices(): Promise<Record<string, number>> {
  const courses = await Course.find({ courseId: { $in: Object.keys(DEFAULT_PRICES) } });
  const prices = { ...DEFAULT_PRICES };
  for (const c of courses as unknown as { courseId?: string; price?: number }[]) {
    if (c.courseId && typeof c.price === "number") prices[c.courseId] = c.price;
  }
  return prices;
}

function calculateBasePrice(slot: SlotLike, selectedModules: string[], prices: Record<string, number>): number {
  if (!slot.isFullCourse) {
    // Module batches have one fixed price for the whole batch — mirrors
    // manualBookSlot exactly: selectedModules is only meaningful for a
    // full-course batch, where the sales person can optionally book a
    // subset of modules instead of the whole thing.
    return slot.price || prices.full_course;
  }
  const modules = selectedModules || [];
  if (modules.length === 0 || modules.includes("full_course")) return prices.full_course;
  const individualCount = modules.filter((m) => m !== "full_course").length;
  if (individualCount === 4) return prices.full_course; // all 4 modules = the same as full course
  return modules.reduce((sum, m) => sum + (m === "full_course" ? 0 : prices[m] ?? 0), 0);
}

/**
 * The pre-discount, pre-GST base price for a slot + module selection —
 * mirrors `/api/manualBookSlot/[id]`'s exact algorithm so the Sales
 * dashboard's enrollment flow matches the existing admin "manual booking"
 * flow's module-selection UX. A full-course batch can optionally be booked
 * for a subset of modules; a module batch always charges its own fixed
 * `price`, `selectedModules` is ignored either way for it.
 */
export async function getSlotBasePrice(slot: SlotLike, selectedModules: string[] = []): Promise<number> {
  const prices = await getCourseModulePrices();
  return calculateBasePrice(slot, selectedModules, prices);
}

/**
 * The `Order.selectedModules` value to actually persist — mirrors
 * manualBookSlot's `selectedModulesFinal`: empty for a module batch (its
 * own price already represents whichever module it is), defaults to
 * `["full_course"]` for a full-course batch when nothing was explicitly
 * picked.
 */
export function resolveOrderSelectedModules(slot: SlotLike, selectedModules: string[] = []): string[] {
  if (!slot.isFullCourse) return [];
  return selectedModules.length > 0 ? selectedModules : ["full_course"];
}

// Was 3000 — dropped to 1 while the sales flow is still in testing (user request, 2026-07-25).
export const MIN_INITIAL_AMOUNT = 1;

const MODULE_SHORT_LABELS: Record<string, string> = {
  ssb_ppdt: "Intro to SSB & PPDT",
  psych: "Psychology Prep",
  interview: "Interview & Mock",
  group_testing: "GTO Course",
  full_course: "Full Course",
};

/** Short human label for a module batch's own module, or a full-course order's selected modules — used in payment-link descriptions. */
export function describeSelectedModules(selectedModules: string[]): string {
  if (selectedModules.length === 0 || selectedModules.includes("full_course")) return MODULE_SHORT_LABELS.full_course;
  return selectedModules.map((m) => MODULE_SHORT_LABELS[m] || m).join(" + ");
}

export type SalesCouponResult =
  | { ok: true; finalPriceInclGST: number; discount: number; couponCode: string | null }
  | { ok: false; error: string };

/**
 * Applies an optional coupon to a base (pre-GST) amount and returns the
 * final GST-inclusive total — mirrors `/api/createOrder`'s inline coupon
 * logic exactly (percent/flat discount off the base amount, then 18% GST on
 * the net). Extended for the sales flow's not-yet-a-student lead: the
 * "already used" check is against any *existing* `User` for the given
 * email, or skipped entirely for a genuinely new email, which by definition
 * can't have used any coupon before. Coupons are Full-Course-only, matching
 * `/api/applyCoupon`'s own rule — server-side here too, never trusting a
 * client-submitted discount (salesimplementation.md Phase 2's rule extended
 * to coupons).
 */
export async function applySalesCoupon(opts: {
  slot: SlotLike;
  baseAmount: number;
  couponCode?: string | null;
  studentEmail: string;
}): Promise<SalesCouponResult> {
  if (!opts.couponCode) {
    return { ok: true, finalPriceInclGST: Math.round(opts.baseAmount * 1.18 * 100) / 100, discount: 0, couponCode: null };
  }
  if (!opts.slot.isFullCourse) {
    return { ok: false, error: "Coupons are only valid for the Full Course." };
  }

  const coupon = await Coupon.findOne({ code: opts.couponCode.toUpperCase(), isActive: true });
  if (!coupon) return { ok: false, error: "Invalid coupon" };
  if (coupon.expiry && new Date(coupon.expiry) < new Date()) return { ok: false, error: "Coupon expired" };

  const existingStudent = await User.findOne({ email: opts.studentEmail }).select("_id");
  if (existingStudent) {
    const alreadyUsed = (coupon.usedBy || []).some(
      (u: { userId: { toString(): string } }) => u.userId.toString() === String(existingStudent._id)
    );
    if (alreadyUsed) return { ok: false, error: "This student has already used this coupon" };
  }

  let discount = 0;
  if (coupon.discountType === "percent") {
    discount = (opts.baseAmount * coupon.discountValue) / 100;
  } else {
    discount = Math.min(coupon.discountValue, opts.baseAmount);
  }

  const netAmount = Math.max(opts.baseAmount - discount, 0);
  const finalPriceInclGST = Math.round((netAmount + netAmount * 0.18) * 100) / 100;

  return { ok: true, finalPriceInclGST, discount: Math.round(discount * 100) / 100, couponCode: coupon.code };
}
