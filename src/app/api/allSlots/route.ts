import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Slot } from "@/server/models";

export async function GET(req: NextRequest) {
  await connectDB();
  const mode = req.nextUrl.searchParams.get("mode");
  // A raw query filter is checked against the stored document, not the
  // Mongoose-hydrated one — so it never sees the schema-level "online"
  // default that every batch created before this field existed only picks
  // up once Mongoose loads it. Treat "no value stored" as an implicit
  // "online" here too, or ?mode=online would drop every pre-existing batch.
  let query = {};
  if (mode === "online") query = { $or: [{ mode: "online" }, { mode: { $exists: false } }] };
  else if (mode === "offline") query = { mode: "offline" };
  const slots = await Slot.find(query).sort({ createdAt: -1 });
  return NextResponse.json(slots);
}
