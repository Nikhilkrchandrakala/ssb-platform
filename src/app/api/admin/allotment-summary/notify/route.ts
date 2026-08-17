import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { computeBatchAllotmentSummary } from "@/server/allotmentSummary";
import { sendAllotmentNotificationEmail, sendAllotmentNotificationSms } from "@/server/integrations/msg91";
import { Notification } from "@/server/models";

/**
 * GET /api/admin/allotment-summary/notify?batch=X
 * Returns the most recent notify-send result per assessor for this batch, so
 * the "Notify Assessors" screen can show who was already notified (and
 * whether it delivered) after a page reload or reselecting the batch —
 * previously that state only lived in React memory and vanished immediately.
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const batch = req.nextUrl.searchParams.get("batch");
    if (!batch) return NextResponse.json({ error: "batch is required" }, { status: 400 });

    const sends = await Notification.find({ type: "ALLOTMENT", batch }).sort({ createdAt: -1 }).lean();

    // One row per assessor: keep only the newest send (sends are already
    // newest-first), so a re-notify after a count change replaces the old
    // result instead of showing a stale/duplicate one underneath it.
    const latestByAssessor = new Map<string, (typeof sends)[number]>();
    for (const send of sends) {
      const assessorId = String(send.recipientId);
      if (!latestByAssessor.has(assessorId)) latestByAssessor.set(assessorId, send);
    }

    const results = Array.from(latestByAssessor.values()).map((send) => ({
      assessorId: String(send.recipientId),
      count: send.count,
      emailDelivered: send.emailDelivered,
      smsDelivered: send.smsDelivered,
      sentAt: send.createdAt,
    }));

    return NextResponse.json({ status: "ok", batch, results });
  } catch (error) {
    console.error("GET /api/admin/allotment-summary/notify error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch notify history" }, { status: 500 });
  }
}

/**
 * POST /api/admin/allotment-summary/notify  { batch: string, assessorIds?: string[] }
 * The "Notify Assessors" button. Recomputes the batch's assessor counts
 * fresh (never trusts a client-submitted count — allotments may have
 * changed since the page was loaded) and sends one email + one SMS per
 * assessor with their current total, per the 2026-08-05 product decision:
 * one notification per assessor per batch, not one per candidate.
 *
 * `assessorIds`, if given, limits the send to just those assessors —
 * added 2026-08-14 so reassigning a single candidate's assessor doesn't
 * force re-notifying every other assessor in the batch whose count hasn't
 * actually changed. Omitted/empty falls back to notifying everyone (the
 * original behavior), so existing callers are unaffected.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { batch, assessorIds } = await req.json();
    if (!batch || typeof batch !== "string") {
      return NextResponse.json({ error: "batch is required" }, { status: 400 });
    }

    const allAssessors = await computeBatchAllotmentSummary(batch);
    const targetIds = Array.isArray(assessorIds) ? new Set<string>(assessorIds) : null;
    const assessors = targetIds && targetIds.size > 0 ? allAssessors.filter((a) => targetIds.has(a.id)) : allAssessors;

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

    // Persist what was actually sent — the send outcome used to live only in
    // the browser's React state (AllotmentSummaryView's `lastResults`), so it
    // silently disappeared the moment the admin navigated away or reselected
    // the batch, with no way to answer "did I already notify this assessor?"
    await Notification.insertMany(
      results.map((r) => ({
        recipientId: r.assessorId,
        title: "Allotment Count Update Sent",
        message: `Notified ${r.name} of ${r.count} candidate(s) allotted in Batch ${batch}.`,
        type: "ALLOTMENT",
        batch,
        count: r.count,
        emailDelivered: r.emailDelivered,
        smsDelivered: r.smsDelivered,
      }))
    );

    return NextResponse.json({ status: "ok", batch, results });
  } catch (error) {
    console.error("POST /api/admin/allotment-summary/notify error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send allotment notifications" }, { status: 500 });
  }
}
