import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Candidate } from "@/server/models";

export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const candidates = await Candidate.find().sort({ createdAt: -1 });
    return NextResponse.json(candidates);
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
