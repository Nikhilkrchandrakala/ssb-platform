import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { User } from "@/server/models";

interface DownloadEntry {
  magazineId: { toString(): string };
  downloadedAt: Date;
}

export async function POST(req: NextRequest) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { magazineId } = body;
    if (!magazineId) {
      return NextResponse.json({ message: "magazineId is required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(sessionUser._id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const existingIndex = (user.downloadedMagazines as DownloadEntry[]).findIndex(
      (d) => d.magazineId.toString() === magazineId
    );

    if (existingIndex !== -1) {
      user.downloadedMagazines[existingIndex].downloadedAt = new Date();
    } else {
      user.downloadedMagazines.push({ magazineId, downloadedAt: new Date() });
    }

    await user.save();

    return NextResponse.json({ success: true, message: "Download tracked" }, { status: 200 });
  } catch (err) {
    console.error("Error tracking download:", err);
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
