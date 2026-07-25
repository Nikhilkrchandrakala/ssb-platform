import fs from "fs";
import path from "path";

const envFiles = [".env.local", ".env", "env", ".env.development"];
for (const envFile of envFiles) {
  const file = path.join(process.cwd(), envFile);
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

const BASE_URL = process.env.PHASE6_VERIFY_BASE_URL || "http://localhost:3000";
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "ssb_session";

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${label}`);
  if (!condition) failures++;
}

function cookieFor(token: string) {
  return `${SESSION_COOKIE_NAME}=${token}`;
}

async function callApi(method: string, urlPath: string, token: string | null, body?: unknown) {
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Cookie: cookieFor(token) } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: Record<string, unknown> = {};
  try {
    json = await res.json();
  } catch {
    // no body
  }
  return { status: res.status, json };
}

async function main() {
  const { connectDB } = await import("../src/server/db");
  const { signSessionToken } = await import("../src/server/auth");
  const { razorpay } = await import("../src/server/integrations/razorpay");
  const { AdminUser } = await import("../src/server/models/AdminUser");
  const { Slot } = await import("../src/server/models/Slot");
  const { Order } = await import("../src/server/models/Order");
  const { InstallmentPlan } = await import("../src/server/models/InstallmentPlan");
  const { SalesAuditLog } = await import("../src/server/models/SalesAuditLog");
  const { User } = await import("../src/server/models/User");
  const { Lead } = await import("../src/server/models/LeadDetails");

  await connectDB();
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  console.log("=== Setup: a head, an exec reporting to them, an unrelated exec, a raw Lead capture, a slot ===");
  const head = await AdminUser.create({
    name: "Phase6 Verify Head",
    email: `phase6-verify-head-${runId}@test.local`,
    password: "not-used",
    role: "admin",
    permissions: ["sales"],
    salesRole: "head",
  });
  const exec = await AdminUser.create({
    name: "Phase6 Verify Exec",
    email: `phase6-verify-exec-${runId}@test.local`,
    password: "not-used",
    role: "admin",
    permissions: ["sales"],
    salesRole: "executive",
    reportsTo: head._id,
  });
  const unrelatedExec = await AdminUser.create({
    name: "Phase6 Verify Unrelated Exec",
    email: `phase6-verify-unrelated-exec-${runId}@test.local`,
    password: "not-used",
    role: "admin",
    permissions: ["sales"],
    salesRole: "executive",
  });
  const studentEmail = `phase6-verify-student-${runId}@test.local`;
  const rawLead = await Lead.create({
    name: "Phase6 Verify Raw Lead",
    email: studentEmail,
    phoneNumber: "9990001234",
  });
  const slot = await Slot.create({
    title: "Phase6 Verify Batch",
    batchNo: `P6-${runId}`,
    startTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    maxStudents: 50,
    price: 5000,
    isFullCourse: false,
  });
  check("Setup: ephemeral accounts + raw lead + slot created", true);

  const execToken = signSessionToken({ id: String(exec._id), role: "admin" });
  const headToken = signSessionToken({ id: String(head._id), role: "admin" });
  const unrelatedExecToken = signSessionToken({ id: String(unrelatedExec._id), role: "admin" });

  console.log("\n=== enrollStudent against an email that matches a raw Lead capture ===");
  const enroll = await callApi("POST", "/api/sales/enrollStudent", execToken, {
    studentName: "Phase6 Verify Student",
    studentEmail,
    slotId: String(slot._id),
    initialAmount: 5900, // slot.price 5000 * 1.18 GST — paid in full up front, so installments: [] is valid (remaining 0)
    installments: [],
  });
  check("enrollStudent: 200", enroll.status === 200);
  const orderId = enroll.json.orderId as string;
  const installmentPlanId = enroll.json.installmentPlanId as string;

  const leadAfter = await Lead.findById(rawLead._id);
  check("DB: the matching raw Lead is now marked converted", !!leadAfter?.convertedAt);
  check("DB: the raw Lead's convertedOrderId matches the new order", String(leadAfter?.convertedOrderId) === String(orderId));

  const allLeadsAsExec = await callApi("GET", "/api/allLeads", execToken);
  const matchingLeadRow = ((allLeadsAsExec.json as unknown as Record<string, unknown>[]) as { email?: string; convertedAt?: string }[] | undefined)?.find?.(
    (l) => l.email?.toLowerCase() === studentEmail
  );
  check("GET /api/allLeads: the converted lead's row carries convertedAt", Array.isArray(allLeadsAsExec.json) && !!matchingLeadRow?.convertedAt);

  console.log("\n=== GET /api/sales/auditLog scoping ===");
  const auditAsExec = await callApi("GET", "/api/sales/auditLog", execToken);
  const execEntries = (auditAsExec.json.entries as { installmentPlanId?: string; action?: string }[]) || [];
  check(
    "auditLog: the enrolling exec sees the LINK_GENERATED entry for their own enrollment",
    auditAsExec.status === 200 && execEntries.some((e) => e.installmentPlanId === installmentPlanId && e.action === "LINK_GENERATED")
  );

  const auditAsHead = await callApi("GET", "/api/sales/auditLog", headToken);
  const headEntries = (auditAsHead.json.entries as { installmentPlanId?: string }[]) || [];
  check("auditLog: the exec's head also sees that entry (rollup)", headEntries.some((e) => e.installmentPlanId === installmentPlanId));

  const auditAsUnrelated = await callApi("GET", "/api/sales/auditLog", unrelatedExecToken);
  const unrelatedEntries = (auditAsUnrelated.json.entries as { installmentPlanId?: string }[]) || [];
  check("auditLog: an unrelated executive does NOT see that entry", !unrelatedEntries.some((e) => e.installmentPlanId === installmentPlanId));

  console.log("\n=== Cleanup: cancel the live Razorpay link + remove all test documents ===");
  const dbPlan = await InstallmentPlan.findById(installmentPlanId);
  const linkId = dbPlan?.installments?.[0]?.paymentLinkId;
  if (linkId) {
    try {
      await razorpay.paymentLink.cancel(linkId);
      check("Cleanup: live Razorpay payment link cancelled", true);
    } catch (err) {
      check(`Cleanup: live Razorpay payment link cancelled (${err instanceof Error ? err.message : err})`, false);
    }
  }
  await InstallmentPlan.deleteOne({ _id: installmentPlanId });
  await Order.deleteOne({ _id: orderId });
  await SalesAuditLog.deleteMany({ installmentPlanId });
  await Lead.deleteOne({ _id: rawLead._id });
  await User.deleteOne({ email: studentEmail });
  await AdminUser.deleteMany({ _id: { $in: [head._id, exec._id, unrelatedExec._id] } });
  await Slot.deleteOne({ _id: slot._id });
  check("Cleanup: all ephemeral test documents removed", true);

  console.log(failures === 0 ? "\nAll Phase 6 sales checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
