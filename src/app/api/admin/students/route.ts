import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { User, Order } from "@/server/models";

/**
 * GET /api/admin/students
 * Fetches all enrolled student accounts with search, filter, and assessor populations.
 * Ported from legacy studentRoutes.js.
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner", "assessor"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const search = req.nextUrl.searchParams.get("search");
    const clinicalStage = req.nextUrl.searchParams.get("clinicalStage");

    const query: Record<string, unknown> = { role: "student" };

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$and = [{ $or: [{ name: regex }, { email: regex }, { phone: regex }] }];
    }

    if (clinicalStage && clinicalStage !== "all") {
      query.clinicalStage = clinicalStage;
    }

    const students = await User.find(query)
      .populate("assignedGTO", "name email phone")
      .populate("assignedTO", "name email phone")
      .populate("assignedPsych", "name email phone")
      .populate("assignedIO", "name email phone")
      .sort({ updatedAt: -1 });

    const studentsWithBatch = await Promise.all(
      students.map(async (student) => {
        let modified = false;

        if (
          !student.role ||
          (student.role !== "student" &&
            student.role !== "lead" &&
            student.role !== "admin" &&
            student.role !== "assessor" &&
            student.role !== "franchise")
        ) {
          student.role = "student";
          modified = true;
        }

        if (!student.batch) {
          const latestOrder = await Order.findOne({ userId: student._id, status: "paid" })
            .populate("slotId")
            .sort({ createdAt: -1 });

          if (latestOrder && latestOrder.slotId && latestOrder.slotId.batchNo) {
            student.batch = latestOrder.slotId.batchNo.trim();
            modified = true;
          }
        }

        if (modified) {
          await student.save();
        }

        return student;
      })
    );

    return NextResponse.json({ status: "ok", students: studentsWithBatch });
  } catch (error) {
    console.error("GET /api/admin/students error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch students" }, { status: 500 });
  }
}

/**
 * POST /api/admin/students
 * Manually creates a new student account in the database.
 * Ported from legacy studentRoutes.js.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { name, email, phone, password, batch, clinicalStage, chestNo } = await req.json();

    if (!name || !email || !phone || !password) {
      return NextResponse.json({ error: "Name, email, phone, and password are required" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      $or: [{ email: emailLower }, { phone: phone.trim() }],
    });

    if (existingUser) {
      return NextResponse.json({ error: "User already exists with this email or phone number" }, { status: 400 });
    }

    const newUser = new User({
      name: name.trim(),
      email: emailLower,
      phone: phone.trim(),
      password,
      batch: (batch || "").trim(),
      chestNo: (chestNo || "").trim(),
      clinicalStage: clinicalStage || "full_course",
      role: "student",
      isManuallyCreated: true,
    });

    await newUser.save();

    return NextResponse.json({ status: "ok", message: "Student created successfully in the database", student: newUser }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/students error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create student" }, { status: 500 });
  }
}
