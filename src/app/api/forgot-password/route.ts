import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/server/db";
import { User } from "@/server/models/User";
import { AdminUser } from "@/server/models/AdminUser";
import { Franchise } from "@/server/models/Franchise";
import { last10 } from "@/server/integrations/msg91";

export async function POST(req: NextRequest) {
  try {
    const { phone, email, newPassword } = await req.json();

    if ((!phone && !email) || !newPassword) {
      return NextResponse.json({ error: "Phone or Email and new password are required" }, { status: 400 });
    }

    await connectDB();

    const phoneLast10 = phone ? last10(phone) : null;

    const buildQuery = (emailField: string, phoneField: string) => {
      if (phone) {
        return phoneLast10
          ? { [phoneField]: { $regex: new RegExp(`${phoneLast10}$`) } }
          : { [phoneField]: phone.toString() };
      }
      if (email) {
        return { [emailField]: email.toLowerCase().trim() };
      }
      return null;
    };

    let userFound = false;

    const userQuery = buildQuery("email", "phone");
    if (userQuery) {
      const userDoc = await User.findOne(userQuery);
      if (userDoc && userDoc.role === "assessor") {
        userDoc.password = newPassword;
        await userDoc.save();
        userFound = true;
      }
    }

    const adminQuery = buildQuery("email", "phone");
    if (adminQuery) {
      const adminDoc = await AdminUser.findOne(adminQuery);
      if (adminDoc) {
        adminDoc.password = newPassword;
        await adminDoc.save();
        userFound = true;
      }
    }

    const franchiseQuery = buildQuery("email", "phone");
    if (franchiseQuery) {
      const franchiseDoc = await Franchise.findOne(franchiseQuery);
      if (franchiseDoc) {
        franchiseDoc.password = await bcrypt.hash(newPassword, 10);
        await franchiseDoc.save();
        userFound = true;
      }
    }

    if (!userFound) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reset failed" }, { status: 500 });
  }
}
