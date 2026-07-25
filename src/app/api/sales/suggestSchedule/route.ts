import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { Slot } from "@/server/models";
import { getSlotBasePrice, applySalesCoupon, MIN_INITIAL_AMOUNT } from "@/server/sales/pricing";

// Stateless preview, no DB writes (salesimplementation.md Phase 2). The Sales
// dashboard form (Phase 4) calls this as the sales person fills in the
// amount/count/date fields, then lets them edit the suggested rows before
// submitting to enrollStudent — which re-validates everything server-side
// regardless of what's submitted here.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasAdminPermission(user, "sales")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { slotId, initialAmount, numberOfInstallments, finalDueDate, couponCode } = body;
    const selectedModules: string[] = Array.isArray(body.selectedModules) ? body.selectedModules : [];
    const studentEmail = String(body.studentEmail || "").trim().toLowerCase();

    await connectDB();

    const slot = await Slot.findById(slotId);
    if (!slot) return NextResponse.json({ message: "Slot not found" }, { status: 404 });

    const baseAmount = await getSlotBasePrice(slot, selectedModules);
    const priced = await applySalesCoupon({ slot, baseAmount, couponCode, studentEmail });
    if (!priced.ok) return NextResponse.json({ message: priced.error }, { status: 400 });
    const { finalPriceInclGST, discount, couponCode: appliedCouponCode } = priced;

    if (typeof initialAmount !== "number" || initialAmount < MIN_INITIAL_AMOUNT || initialAmount > finalPriceInclGST) {
      return NextResponse.json(
        { message: `initialAmount must be between ₹${MIN_INITIAL_AMOUNT} and ₹${finalPriceInclGST}` },
        { status: 400 }
      );
    }

    const remaining = Math.round((finalPriceInclGST - initialAmount) * 100) / 100;

    if (remaining <= 0) {
      return NextResponse.json({ finalPriceInclGST, initialAmount, remaining: 0, installments: [], discount, couponCode: appliedCouponCode });
    }

    if (!Number.isInteger(numberOfInstallments) || numberOfInstallments < 1) {
      return NextResponse.json({ message: "numberOfInstallments must be a positive integer" }, { status: 400 });
    }

    const final = new Date(finalDueDate);
    const now = new Date();
    if (Number.isNaN(final.getTime()) || final <= now) {
      return NextResponse.json({ message: "finalDueDate must be a valid date in the future" }, { status: 400 });
    }

    // Even-amount, evenly-spaced-to-finalDueDate breakdown (Open Decision #2).
    // Any rounding remainder lands on the last installment so the total is exact.
    const perAmount = Math.floor((remaining / numberOfInstallments) * 100) / 100;
    const totalMs = final.getTime() - now.getTime();
    let allocated = 0;
    const installments: { seq: number; amount: number; dueDate: string }[] = [];
    for (let i = 1; i <= numberOfInstallments; i++) {
      const isLast = i === numberOfInstallments;
      const amount = isLast ? Math.round((remaining - allocated) * 100) / 100 : perAmount;
      allocated += amount;
      const dueDate = isLast ? final : new Date(now.getTime() + (totalMs * i) / numberOfInstallments);
      // seq 1 is reserved for the initial payment itself (set on enrollStudent);
      // these are the installments after it.
      installments.push({ seq: i + 1, amount, dueDate: dueDate.toISOString() });
    }

    return NextResponse.json({ finalPriceInclGST, initialAmount, remaining, installments, discount, couponCode: appliedCouponCode });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
