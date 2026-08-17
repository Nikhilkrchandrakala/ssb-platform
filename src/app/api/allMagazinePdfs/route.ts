import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { MagazinePdf } from "@/server/models";
import { isSignedUpSiteUser } from "@/lib/siteAccess";

export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    const canDownload = isSignedUpSiteUser(user);
    const data = await MagazinePdf.find({});

    // Browsing (title/cover/tags) stays public for marketing purposes, but
    // the actual file path must not reach a visitor who isn't a genuine
    // signed-up account — otherwise a /api/quickJoin lead session (minted
    // from an unverified, possibly made-up email) could read it straight off
    // this response without ever proving identity or paying. The client-side
    // gate in MagazineView is defense-in-depth on top of this, not the only
    // check — that page's fetch of this same route is how it would have
    // gotten the URL in the first place.
    const sanitized = canDownload
      ? data
      : data.map((item) => {
          const obj = item.toObject();
          delete obj.pdfFilePath;
          return obj;
        });

    return NextResponse.json(sanitized, { status: 200 });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
