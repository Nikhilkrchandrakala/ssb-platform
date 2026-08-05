import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { computeBatchAllotmentSummary } from "@/server/allotmentSummary";
import { sendAllotmentNotificationEmail, sendAllotmentNotificationSms } from "@/server/integrations/msg91";

/**
 * POST /api/admin/allotment-summary/notify  { batch: string }
 * The "Notify Assessors" button. Recomputes the batch's assessor counts
 * fresh (never trusts a client-submitted count — allotments may have
 * changed since the page was loaded) and sends one email + one SMS per
 * assessor with their current total, per the 2026-08-05 product decision:
 * one notification per assessor per batch, not one per candidate.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { batch } = await req.json();
    if (!batch || typeof batch !== "string") {
      return NextResponse.json({ error: "batch is required" }, { status: 400 });
    }

    const assessors = await computeBatchAllotmentSummary(batch);

    const results = await Promise.all(
      assessors.map(async (a) => {
        const [emailResult, smsResult] = await Promise.all([
          a.email
            ? sendAllotmentNotificationEmail({ to: a.email, assessorName: a.name, numberOfCandidates: a.count, batchNo: batch })
            : Promise.resolve({ delivered: false }),
          a.phone
            ? sendAllotmentNotificationSms({ toPhone: a.phone, assessorName: a.name, numberOfCandidates: a.count, batchNo: batch })
            : Promise.resolve({ delivered: false }),
        ]);
        return {
          assessorId: a.id,
          name: a.name,
          count: a.count,
          emailDelivered: emailResult.delivered,
          smsDelivered: smsResult.delivered,
        };
      })
    );

    return NextResponse.json({ status: "ok", batch, results });
  } catch (error) {
    console.error("POST /api/admin/allotment-summary/notify error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send allotment notifications" }, { status: 500 });
  }
}
