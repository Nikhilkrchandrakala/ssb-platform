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
  const program = req.nextUrl.searchParams.get("program");
  const includeCancelled = req.nextUrl.searchParams.get("includeCancelled") === "true";
  let query: Record<string, unknown> = {};
  if (!includeCancelled) {
    query.isCancelled = { $ne: true };
  }
  if (mode === "online") {
    query.$and = [
      ...(query.isCancelled !== undefined ? [{ isCancelled: { $ne: true } }] : []),
      { $or: [{ mode: "online" }, { mode: { $exists: false } }] },
    ];
    delete query.isCancelled;
  } else if (mode === "offline") {
    query.mode = "offline";
  }

  if (program === "soft_skills") {
    const softSkillsFilter = {
      $or: [{ programType: "soft_skills" }, { title: { $regex: /soft skills/i } }],
    };
    if (query.$and && Array.isArray(query.$and)) {
      query.$and.push(softSkillsFilter);
    } else {
      query.$and = [
        ...(query.isCancelled !== undefined ? [{ isCancelled: query.isCancelled }] : []),
        softSkillsFilter,
      ];
      delete query.isCancelled;
    }
  } else if (program === "ssb") {
    const ssbFilter = {
      programType: { $ne: "soft_skills" },
      title: { $not: /soft skills/i },
    };
    if (query.$and && Array.isArray(query.$and)) {
      query.$and.push(ssbFilter);
    } else {
      query.$and = [
        ...(query.isCancelled !== undefined ? [{ isCancelled: query.isCancelled }] : []),
        ssbFilter,
      ];
      delete query.isCancelled;
    }
  }

  const slots = await Slot.find(query).sort({ createdAt: -1 });
  return NextResponse.json(slots);
}
