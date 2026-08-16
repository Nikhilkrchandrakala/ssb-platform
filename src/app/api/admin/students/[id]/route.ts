import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { User, Order, Submission } from "@/server/models";

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
    if (clinicalStage) student.clinicalStage = clinicalStage;

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
 * Permanently removes a candidate trainee's account.
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
    const student = await User.findByIdAndDelete(id);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "ok", message: "Student deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/students/:id error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete student" }, { status: 500 });
  }
}
