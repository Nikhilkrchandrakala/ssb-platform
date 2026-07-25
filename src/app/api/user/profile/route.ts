import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { User } from "@/server/models";
import { uploadToR2 } from "@/server/storage/r2";

/**
 * GET /api/user/profile
 * Self-scoped — any logged-in user. Re-fetches fresh from the User collection
 * (password excluded) rather than trusting the session-derived object, which
 * legacy's authMiddleware also did via `.select("-password")`.
 * Ported from legacy UserProfile.js.
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const userId = currentUser._id || currentUser.id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "ok", user });
  } catch (error) {
    return NextResponse.json({ status: "error", message: error instanceof Error ? error.message : "Failed to fetch profile" }, { status: 500 });
  }
}

/**
 * PUT /api/user/profile
 * Updates the logged-in user's name/email/phone/Address and optionally
 * uploads a new profile image to Cloudflare R2 (folder "profile"), replacing
 * legacy's `profileUpload` multer disk storage.
 * Ported from legacy UserProfile.js.
 */
export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const userId = currentUser._id || currentUser.id;
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const contentType = req.headers.get("content-type") || "";
    let name: string | undefined;
    let email: string | undefined;
    let phone: string | undefined;
    let Address: string | undefined;
    let profileImageFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      name = (formData.get("name") as string) || undefined;
      email = (formData.get("email") as string) || undefined;
      phone = (formData.get("phone") as string) || undefined;
      Address = (formData.get("Address") as string) || undefined;
      const file = formData.get("profileImage");
      if (file instanceof File && file.size > 0) {
        profileImageFile = file;
      }
    } else {
      const body = await req.json();
      name = body.name;
      email = body.email;
      phone = body.phone;
      Address = body.Address;
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (Address) user.Address = Address;

    if (profileImageFile) {
      const { url } = await uploadToR2("profile", profileImageFile);
      user.profileImage = url;
    }

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    return NextResponse.json({ status: "ok", message: "Profile updated successfully", user: userObj });
  } catch (error) {
    return NextResponse.json({ status: "error", message: error instanceof Error ? error.message : "Failed to update profile" }, { status: 500 });
  }
}
