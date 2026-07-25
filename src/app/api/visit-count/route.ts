import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Visitor } from "@/server/models";

/**
 * GET /api/visit-count
 * Public — returns the site visit counter without incrementing it.
 * Ported from legacy visitorRoute.js.
 */
export async function GET() {
  try {
    await connectDB();

    const visitor = await Visitor.findOne();
    return NextResponse.json({ visits: visitor ? visitor.count : 0 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to fetch visit count" }, { status: 500 });
  }
}
