import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "../_lib/auth";
import { uploadToR2 } from "@/server/storage/r2";

// POST /api/psych/uploadBatteryImage — any logged-in user (used by students
// uploading Dossier scans, capped at 2MB for their role). Legacy forwarded
// this to itself/the main backend over HTTP (`forwardToMainBackend`); that
// hop is deleted now that everything is one app — files go straight to R2.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    if (user.role === "student" && file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ message: "File size exceeds the 2MB limit for Dossier uploads" }, { status: 400 });
    }

    const { url } = await uploadToR2("battery", file);
    return NextResponse.json({ url, message: "File uploaded successfully" });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
