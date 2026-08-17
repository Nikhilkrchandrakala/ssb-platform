import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { User, Order, Submission, InstallmentPlan, Notification, SalesAuditLog, Slot, Lead, DeletedUserLog } from "@/server/models";

/**
 * GET /api/admin/students/:id
 * Fetches detail of a student, populated with their paid registration course order history.
 * Ported from legacy studentRoutes.js.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner", "assessor"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;

    const student = await User.findById(id)
      .populate("assignedGTO", "name email phone")
      .populate("assignedTO", "name email phone")
      .populate("assignedPsych", "name email phone")
      .populate("assignedIO", "name email phone");

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (
      !student.role ||
      (student.role !== "student" &&
        student.role !== "lead" &&
        student.role !== "admin" &&
        student.role !== "assessor" &&
        student.role !== "franchise")
    ) {
      student.role = "student";
      await student.save();
    }

    if (!student.batch) {
      const latestOrder = await Order.findOne({ userId: id, status: "paid" }).populate("slotId").sort({ createdAt: -1 });

      if (latestOrder && latestOrder.slotId && latestOrder.slotId.batchNo) {
        student.batch = latestOrder.slotId.batchNo.trim();
        await student.save();
      }
    }

    const orders = await Order.find({ userId: id, status: "paid" }).populate("slotId").sort({ createdAt: -1 });

    let submissions: unknown[] = [];
    try {
      submissions = await Submission.find({ userId: id });
    } catch (subErr) {
      console.error("Error fetching submissions:", subErr);
    }

    return NextResponse.json({ status: "ok", student, orders, submissions });
  } catch (error) {
    console.error("GET /api/admin/students/:id error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch student" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/students/:id
 * Updates name, email, phone, batch, and stage for a specific student.
 * Ported from legacy studentRoutes.js.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const { name, email, phone, batch, clinicalStage, chestNo } = await req.json();

    const student = await User.findById(id);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (name) student.name = name.trim();
    if (email) student.email = email.toLowerCase().trim();
    if (phone) student.phone = phone.trim();
    if (batch !== undefined) student.batch = (batch || "").trim();
    if (chestNo !== undefined) student.chestNo = (chestNo || "").trim();
    // `!== undefined` (not truthy) so the frontend can send "" to explicitly
    // clear a lead's clinicalStage — a falsy-check here would silently
    // no-op that intentional clear and leave a previously-set value in place.
    if (clinicalStage !== undefined) student.clinicalStage = clinicalStage;

    if (
      !student.role ||
      (student.role !== "student" &&
        student.role !== "lead" &&
        student.role !== "admin" &&
        student.role !== "assessor" &&
        student.role !== "franchise")
    ) {
      student.role = "student";
    }
    await student.save();

    return NextResponse.json({ status: "ok", message: "Student credentials updated successfully", student });
  } catch (error) {
    console.error("PUT /api/admin/students/:id error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update student" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/students/:id
 *
 * Permanently removes a candidate's account AND every record anywhere in the
 * system that referenced it — Orders, Submissions, InstallmentPlans,
 * Notifications, SalesAuditLog entries, and their seat in any Slot's
 * bookedStudents list — so nothing is left pointing at an account that no
 * longer exists (the earlier version only removed the User document itself,
 * which is exactly what caused Sales/Franchise/assessor screens to start
 * showing blank "—" names for orphaned records after a delete).
 *
 * Also clears any *incoming* references in case the deleted account was
 * itself an assessor (assignedGTO/TO/Psych/IO live on the *candidate's* own
 * document, pointing at the assessor, so those don't get caught by deleting
 * this document — they have to be nulled out on whichever other User docs
 * point here).
 *
 * The whole cascade runs inside one transaction so a failure partway through
 * can't leave the account half-deleted with some but not all related records
 * gone — either everything above is removed together, or none of it is.
 *
 * A snapshot (name/email/phone/role + counts of what was purged) is written
 * to DeletedUserLog before the User document itself disappears, so "who did
 * we delete and when" stays answerable — see GET /api/admin/deleted-users.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const student = await User.findById(id);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const session = await mongoose.startSession();
    let purged = {
      orders: 0,
      submissions: 0,
      installmentPlans: 0,
      notifications: 0,
      salesAuditLogs: 0,
      slotSeatsFreed: 0,
    };

    try {
      await session.withTransaction(async () => {
        const orders = await Order.find({ userId: id }).select("_id").session(session);
        const orderIds = orders.map((o) => o._id);
        const plans = await InstallmentPlan.find({ studentId: id }).select("_id").session(session);
        const planIds = plans.map((p) => p._id);

        const [orderRes, planRes, subRes, notifRes, auditRes, slotRes] = await Promise.all([
          Order.deleteMany({ userId: id }).session(session),
          InstallmentPlan.deleteMany({ studentId: id }).session(session),
          Submission.deleteMany({ userId: id }).session(session),
          Notification.deleteMany({ $or: [{ recipientId: id }, { studentId: id }] }).session(session),
          SalesAuditLog.deleteMany({
            $or: [{ orderId: { $in: orderIds } }, { installmentPlanId: { $in: planIds } }],
          }).session(session),
          Slot.updateMany({ bookedStudents: id }, { $pull: { bookedStudents: id } }).session(session),
        ]);

        purged = {
          orders: orderRes.deletedCount || 0,
          installmentPlans: planRes.deletedCount || 0,
          submissions: subRes.deletedCount || 0,
          notifications: notifRes.deletedCount || 0,
          salesAuditLogs: auditRes.deletedCount || 0,
          slotSeatsFreed: slotRes.modifiedCount || 0,
        };

        await Promise.all([
          User.updateMany({ assignedGTO: id }, { $set: { assignedGTO: null } }).session(session),
          User.updateMany({ assignedTO: id }, { $set: { assignedTO: null } }).session(session),
          User.updateMany({ assignedPsych: id }, { $set: { assignedPsych: null } }).session(session),
          User.updateMany({ assignedIO: id }, { $set: { assignedIO: null } }).session(session),
          Submission.updateMany({ assessorId: id }, { $unset: { assessorId: "" } }).session(session),
          Submission.updateMany(
            { "adminApproval.approvedBy": id },
            { $set: { "adminApproval.approvedBy": null } }
          ).session(session),
          Lead.updateMany({ convertedOrderId: { $in: orderIds } }, { $set: { convertedOrderId: null } }).session(session),
        ]);

        await DeletedUserLog.create(
          [
            {
              name: student.name,
              email: student.email,
              phone: student.phone,
              role: student.role,
              batch: student.batch,
              chestNo: student.chestNo,
              deletedBy: currentUser._id || currentUser.id,
              deletedByName: currentUser.name,
              purged,
            },
          ],
          { session }
        );

        await User.findByIdAndDelete(id).session(session);
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ status: "ok", message: "Student and all related records deleted successfully", purged });
  } catch (error) {
    console.error("DELETE /api/admin/students/:id error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete student" }, { status: 500 });
  }
}
