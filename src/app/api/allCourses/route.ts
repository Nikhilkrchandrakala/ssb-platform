import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Course } from "@/server/models";

export async function GET() {
  await connectDB();
  const courses = await Course.find().sort({ createdAt: -1 });
  return NextResponse.json(courses);
}
