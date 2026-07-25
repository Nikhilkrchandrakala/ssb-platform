import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { NumberMonitor } from "@/server/models";

/**
 * GET /api/allNumberMonitors
 * Public — landing-page stat-counter widget data.
 * Ported from legacy NumberMonitor.js.
 */
export async function GET() {
  try {
    await connectDB();
    const data = await NumberMonitor.find({});
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to fetch entries" }, { status: 500 });
  }
}
