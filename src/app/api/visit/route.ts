import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Visitor } from "@/server/models";

/**
 * GET /api/visit
 * Public tracking ping — increments and returns the site visit counter.
 * Ported from legacy visitorRoute.js.
 */
export async function GET() {
  try {
    await connectDB();

    let visitor = await Visitor.findOne();

    if (!visitor) {
      visitor = new Visitor({ count: 1 });
    } else {
      visitor.count += 1;
    }

    await visitor.save();

    return NextResponse.json({ success: true, visits: visitor.count });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Failed to record visit" }, { status: 500 });
  }
}
