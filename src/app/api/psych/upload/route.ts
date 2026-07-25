import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireAdmin } from "../_lib/auth";
import { uploadToR2 } from "@/server/storage/r2";

// POST /api/psych/upload — generic admin file upload (e.g. slide images).
// Admin/owner only. Legacy forwarded the file to the main Express backend's
// /api/uploadBatteryImage over HTTP (`forwardToMainBackend`); that hop is
// deleted now that everything is one app — files go straight to R2.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const forbidden = requireAdmin(auth.user);
  if (forbidden) return forbidden;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const { url } = await uploadToR2("battery", file);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
