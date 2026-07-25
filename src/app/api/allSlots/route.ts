import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Slot } from "@/server/models";

export async function GET() {
  await connectDB();
  const slots = await Slot.find().sort({ createdAt: -1 });
  return NextResponse.json(slots);
}
