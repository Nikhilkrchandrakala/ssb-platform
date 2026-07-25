import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { User } from "@/server/models";

interface DownloadEntry {
  magazineId: Record<string, unknown> & { toObject?: () => Record<string, unknown> };
  downloadedAt: Date;
}

export async function GET(_req: NextRequest) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();

    const user = await User.findById(sessionUser._id).populate("downloadedMagazines.magazineId");
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const downloads = (user.downloadedMagazines as DownloadEntry[])
      .filter((d) => d.magazineId)
      .sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime())
      .map((d) => ({
        ...(d.magazineId.toObject ? d.magazineId.toObject() : d.magazineId),
        downloadedAt: d.downloadedAt,
      }));

    return NextResponse.json(downloads, { status: 200 });
  } catch (err) {
    console.error("Error fetching user downloads:", err);
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
