import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { Order, User, SalesAuditLog } from "@/server/models";
import { sendMail } from "@/server/integrations/email";
import { assertCanAccessPlan, toSalesActor } from "@/server/sales/scope";

/**
 * POST /api/sales/resetStudentCredentials
 *
 * On-demand fallback for the Sales dashboard's "Payment Details" view: lets
 * the owning sales person (or their head/the owner) generate a fresh random
 * password for an already-provisioned sales student and see it on screen.
 * Exists because the plaintext password from markInstallmentPaid's original
 * provisioning is never stored anywhere — it's shown once via
 * checkInstallmentStatus's response and otherwise only emailed — so if that
 * one-time reveal was missed (or the credentials email itself failed to
 * send, e.g. bad SMTP creds), there was previously no way to recover access
 * short of a full password-reset-by-email flow. This always resets the
 * password (never retrieves an old one, which isn't recoverable by design).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasAdminPermission(user, "sales")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ message: "orderId is required" }, { status: 400 });

    await connectDB();

    const order = await Order.findById(orderId).populate("salesPersonId", "reportsTo");
    if (!order || order.bookingMethod !== "sales") {
      return NextResponse.json({ message: "Sales order not found" }, { status: 404 });
    }
    if (order.status !== "paid") {
      return NextResponse.json({ message: "This student hasn't completed their first payment yet" }, { status: 400 });
    }

    if (!assertCanAccessPlan(toSalesActor(user!), order.salesPersonId as unknown as { _id: unknown; reportsTo?: unknown })) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const student = await User.findById(order.userId);
    if (!student) return NextResponse.json({ message: "Student account not found" }, { status: 404 });

    const plainPassword = crypto.randomBytes(9).toString("base64url");
    student.password = plainPassword;
    await student.save();

    const mail = await sendMail({
      to: student.email,
      subject: "Your SSB with ISV login details (reset)",
      html: `<p>Hi ${student.name},</p><p>Your login password has been reset by your enrollment contact.</p><p>Login email: ${student.email}<br/>Password: ${plainPassword}</p><p>Please sign in and change your password.</p>`,
    });

    await SalesAuditLog.create({
      actorId: user!._id,
      action: "PLAN_EDITED",
      orderId: order._id,
      installmentPlanId: order.installmentPlanId,
      meta: { type: "credentials_reset", emailDelivered: mail.delivered },
    });

    return NextResponse.json({
      email: student.email,
      password: plainPassword,
      emailDelivered: mail.delivered,
    });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
