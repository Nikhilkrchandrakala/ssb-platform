import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/server/integrations/razorpay";
import { markInstallmentPaid } from "@/server/sales/markInstallmentPaid";

// Force the Node.js runtime — needs the raw request body for HMAC verification,
// which the Edge runtime's body handling doesn't guarantee byte-for-byte.
export const runtime = "nodejs";

interface RazorpayWebhookEvent {
  event?: string;
  payload?: {
    payment_link?: { entity?: { notes?: Record<string, string> } };
    order?: { entity?: { notes?: Record<string, string> } };
    payment?: { entity?: { id?: string } };
  };
}

/**
 * POST /api/webhooks/razorpay (salesimplementation.md Phase 3).
 *
 * Authoritative payment confirmation for the sales installment flow — never
 * the client-side checkout redirect alone. Handles two event shapes that both
 * carry an installment's `{ installmentPlanId, seq }` in `notes`:
 *  - `payment_link.paid`: the sales-person-generated link (Phase 2's
 *    `createPaymentLink`, notes set in `enrollStudent`).
 *  - `order.paid`: the student dashboard's own "Pay Now" checkout order
 *    (`/api/installments/payOrder`, notes set there) — chosen over
 *    `payment.captured` because Razorpay only echoes an order's notes back
 *    on events where `order` is in `contains`, which `order.paid` guarantees.
 *
 * Any other event, or a payment_link/order whose notes don't carry an
 * `installmentPlanId` (e.g. the unrelated self-serve `/api/createOrder`
 * flow, which sets different notes), is a deliberate no-op — this route only
 * ever acts on sales-installment payments.
 *
 * Delegates the actual "mark paid (+ unlock/provision if first)" work to
 * `markInstallmentPaid`, the same function Phase 2's `checkInstallmentStatus`
 * stopgap already calls, so there is exactly one such code path. That
 * function is itself idempotent on `paymentId`, so a re-delivered webhook
 * event is a safe no-op.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const notes =
    event.event === "payment_link.paid"
      ? event.payload?.payment_link?.entity?.notes
      : event.event === "order.paid"
        ? event.payload?.order?.entity?.notes
        : undefined;

  const paymentId = event.payload?.payment?.entity?.id;

  // Handle Soft Skills Bootcamp Payment Link fulfillment
  if (notes?.programType === "soft_skills" && paymentId) {
    try {
      const { connectDB } = await import("@/server/db");
      const { User, Slot, Order } = await import("@/server/models");
      await connectDB();

      const customerEmail = (notes.customerEmail || notes.email || "").trim().toLowerCase();
      if (!customerEmail) {
        return NextResponse.json({ received: true, handled: false, error: "Missing customerEmail" });
      }

      let targetUser = await User.findOne({ email: customerEmail });
      if (!targetUser) {
        targetUser = new User({
          name: notes.customerName || "Student",
          email: customerEmail,
          phone: notes.customerPhone || undefined,
          role: "student",
          enrolledPrograms: ["soft_skills_bootcamp"],
        });
      } else {
        targetUser.role = "student";
        if (!targetUser.enrolledPrograms) targetUser.enrolledPrograms = [];
        if (!targetUser.enrolledPrograms.includes("soft_skills_bootcamp")) {
          targetUser.enrolledPrograms.push("soft_skills_bootcamp");
        }
      }

      let slotDoc: any = null;
      if (notes.slotId) {
        slotDoc = await Slot.findById(notes.slotId);
        if (slotDoc) {
          if (!slotDoc.bookedStudents.some((id: any) => id.toString() === targetUser._id.toString())) {
            slotDoc.bookedStudents.push(targetUser._id);
            await slotDoc.save();
          }
          if (slotDoc.batchNo) {
            targetUser.batch = slotDoc.batchNo.trim();
          }
        }
      }

      targetUser.markModified("updatedAt");
      await targetUser.save();

      const existingOrder = await Order.findOne({ transactionRef: paymentId });
      if (!existingOrder) {
        const amountInPaise =
          (event.payload?.payment_link?.entity as any)?.amount_paid ||
          (event.payload?.payment?.entity as any)?.amount ||
          0;
        const paidRupees = amountInPaise > 0 ? amountInPaise / 100 : 7078.82;

        const order = new Order({
          userId: targetUser._id,
          buyerName: targetUser.name,
          buyerEmail: targetUser.email,
          slotId: slotDoc?._id,
          price: paidRupees,
          status: "paid",
          bookingMethod: "payment_link",
          programType: "soft_skills",
          paymentMethod: "razorpay",
          transactionRef: paymentId,
        });
        await order.save();
      }

      return NextResponse.json({ received: true, handled: true, programType: "soft_skills" });
    } catch (softSkillsErr) {
      console.error("[webhooks/razorpay] soft_skills enrollment failed", softSkillsErr);
      return NextResponse.json({ message: "Soft Skills webhook handling failed" }, { status: 500 });
    }
  }

  const installmentPlanId = notes?.installmentPlanId;
  const seq = Number(notes?.seq);

  if (!installmentPlanId || !seq || !paymentId) {
    // Not a sales-installment payment (wrong event type, or notes belong to
    // an unrelated order/link) — acknowledge and do nothing.
    return NextResponse.json({ received: true, handled: false });
  }

  try {
    const result = await markInstallmentPaid({ installmentPlanId, seq, paymentId });
    return NextResponse.json({ received: true, handled: true, alreadyProcessed: result.alreadyProcessed });
  } catch (err) {
    // A real failure (DB hiccup, data inconsistency) — return 5xx so Razorpay
    // retries with its own backoff, rather than silently losing the event.
    console.error("[webhooks/razorpay] markInstallmentPaid failed", err);
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
