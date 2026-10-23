import { NextRequest, NextResponse } from "next/server";
import { escapeRegExp } from "@/server/escapeRegExp";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { User, Order, Slot } from "@/server/models";
import { resolveClinicalStageFromModules } from "@/server/clinicalStageSync";
import { sendCredentialsEmail } from "@/server/integrations/msg91";

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
      const regex = new RegExp(escapeRegExp(search.trim()), "i");
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

        // One query serves both the batch-backfill below AND the per-batch
        // rows the roster table renders — a student with N paid batches now
        // shows as N rows (repeating the candidate), same presentation as
        // the Allotment page, instead of collapsing to a single row whose
        // batch/type/course/assessor columns only ever reflected one batch.
        const paidOrders = await Order.find({ userId: student._id, status: "paid" })
          .populate("slotId", "title batchNo mode isFullCourse programType")
          .populate("assignedGTO", "name")
          .populate("assignedTO", "name")
          .populate("assignedPsych", "name")
          .populate("assignedIO", "name")
          .select("slotId selectedModules assignedGTO assignedTO assignedPsych assignedIO assignedAssessments price createdAt programType paymentMethod transactionRef bookingMethod")
          .sort({ createdAt: -1 });

        if (!student.batch && paidOrders.length > 0 && paidOrders[0].slotId?.batchNo) {
          student.batch = paidOrders[0].slotId.batchNo.trim();
          modified = true;
        }

        const onlineOrders = paidOrders.filter((o) => (o.slotId as unknown as { mode?: string })?.mode !== "offline");
        const hasFullCourseOrder = onlineOrders.some((o) => {
          const mods = o.selectedModules || [];
          const slot = o.slotId as unknown as { isFullCourse?: boolean } | null;
          return mods.includes("full_course") || (slot?.isFullCourse && mods.length === 0);
        });

        if (!student.clinicalStage || (student.clinicalStage === "full_course" && !hasFullCourseOrder && onlineOrders.length > 0)) {
          const allModules = Array.from(
            new Set(
              onlineOrders.flatMap((o) => o.selectedModules || []).filter((m: string) => m && m !== "full_course")
            )
          );
          if (allModules.length > 0 && allModules.length < 4) {
            const expectedStage = resolveClinicalStageFromModules(allModules);
            if (student.clinicalStage !== expectedStage) {
              student.clinicalStage = expectedStage;
              modified = true;
            }
          }
        }

        if (modified) {
          await student.save();
        }

        const plain = student.toObject();
        plain.orders = paidOrders.map((o) => (o.toObject ? o.toObject() : o));
        return plain;
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

    const { name, email, phone, password, batch, clinicalStage, chestNo, enrollmentMode, sendCredentials } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (enrollmentMode !== "online" && enrollmentMode !== "offline") {
      return NextResponse.json({ error: "enrollmentMode must be 'online' or 'offline'" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const cleanPhone = phone && typeof phone === "string" && phone.trim() ? phone.trim() : null;

    const duplicateChecks: Array<Record<string, unknown>> = [{ email: emailLower }];
    if (cleanPhone) {
      duplicateChecks.push({ phone: cleanPhone });
    }

    const existingUser = await User.findOne({
      $or: duplicateChecks,
    });

    if (existingUser) {
      return NextResponse.json({ error: "User already exists with this email or phone number" }, { status: 400 });
    }

    const newUser = new User({
      name: name.trim(),
      email: emailLower,
      ...(cleanPhone ? { phone: cleanPhone } : {}),
      password,
      batch: (batch || "").trim(),
      chestNo: (chestNo || "").trim(),
      clinicalStage: clinicalStage || "full_course",
      enrollmentMode,
      role: "student",
      isManuallyCreated: true,
    });

    await newUser.save();

    // Automatically book the candidate into the slot and create a paid manual order
    // so their dashboard (/ProfileDashboard) immediately displays the purchased batch
    // and they appear in Admin > Assessor Allotment.
    const cleanBatch = (batch || "").trim();
    if (cleanBatch) {
      try {
        let slot = await Slot.findOne({
          batchNo: cleanBatch,
          ...(enrollmentMode ? { mode: enrollmentMode } : {}),
          isCancelled: { $ne: true },
        });
        if (!slot) {
          slot = await Slot.findOne({
            batchNo: cleanBatch,
            isCancelled: { $ne: true },
          });
        }

        if (!slot) {
          slot = new Slot({
            title: `${cleanBatch} Batch`,
            batchNo: cleanBatch,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 86400000 * 14).toISOString(),
            maxStudents: 50,
            price: 0,
            mode: enrollmentMode || "online",
            isFullCourse: clinicalStage === "full_course",
          });
          await slot.save();
        }

        if (slot) {
          if (!slot.bookedStudents.some((id: unknown) => String(id) === String(newUser._id))) {
            slot.bookedStudents.push(newUser._id);
            await slot.save();
          }

          const selectedMods = clinicalStage
            ? clinicalStage.split(",").map((s: string) => s.trim()).filter(Boolean)
            : ["full_course"];

          const order = new Order({
            userId: newUser._id,
            buyerName: newUser.name,
            buyerEmail: newUser.email,
            buyerPhone: cleanPhone || null,
            slotId: slot._id,
            price: 0,
            originalAmount: slot.price || 0,
            discount: slot.price || 0,
            status: "paid",
            selectedModules: selectedMods,
            bookingMethod: "manual",
          });
          await order.save();
        }
      } catch (orderErr) {
        console.error("Failed to automatically create slot order for trainee:", orderErr);
      }
    }

    let emailSent = false;
    if (sendCredentials !== false) {
      try {
        const mailRes = await sendCredentialsEmail({
          to: emailLower,
          name: name.trim(),
          username: emailLower,
          password: password,
        });
        emailSent = Boolean(mailRes?.delivered);
      } catch (mailErr) {
        console.error("Failed to send credentials email:", mailErr);
      }
    }

    return NextResponse.json(
      {
        status: "ok",
        message: emailSent
          ? "Student created and credentials emailed successfully"
          : "Student created successfully in the database",
        emailSent,
        student: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/students error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create student" }, { status: 500 });
  }
}
