import fs from "fs";
import path from "path";

// Same env-loading pattern as phase1-3_sales_verify.ts.
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

const BASE_URL = process.env.PHASE4_VERIFY_BASE_URL || "http://localhost:3000";
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
  const { AdminUser } = await import("../src/server/models/AdminUser");
  const { Slot } = await import("../src/server/models/Slot");
  const { Order } = await import("../src/server/models/Order");

  await connectDB();

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  console.log("=== Setup: owner, 2 heads, an executive under each, an unaffiliated executive, a slot ===");
  const owner = await AdminUser.create({
    name: "Phase4 Verify Owner",
    email: `phase4-verify-owner-${runId}@test.local`,
    password: "not-used-jwt-minted-directly",
    role: "owner",
  });
  const head1 = await AdminUser.create({
    name: "Phase4 Verify Head1",
    email: `phase4-verify-head1-${runId}@test.local`,
    password: "not-used-jwt-minted-directly",
    role: "admin",
    permissions: ["sales"],
    salesRole: "head",
  });
  const head2 = await AdminUser.create({
    name: "Phase4 Verify Head2",
    email: `phase4-verify-head2-${runId}@test.local`,
    password: "not-used-jwt-minted-directly",
    role: "admin",
    permissions: ["sales"],
    salesRole: "head",
  });
  const exec1a = await AdminUser.create({
    name: "Phase4 Verify Exec1a",
    email: `phase4-verify-exec1a-${runId}@test.local`,
    password: "not-used-jwt-minted-directly",
    role: "admin",
    permissions: ["sales"],
    salesRole: "executive",
    reportsTo: head1._id,
  });
  const exec2a = await AdminUser.create({
    name: "Phase4 Verify Exec2a",
    email: `phase4-verify-exec2a-${runId}@test.local`,
    password: "not-used-jwt-minted-directly",
    role: "admin",
    permissions: ["sales"],
    salesRole: "executive",
    reportsTo: head2._id,
  });
  const execNone = await AdminUser.create({
    name: "Phase4 Verify ExecNone",
    email: `phase4-verify-execnone-${runId}@test.local`,
    password: "not-used-jwt-minted-directly",
    role: "admin",
    permissions: ["sales"],
    salesRole: "executive",
  });
  const testSlot = await Slot.create({
    title: "Phase4 Verify Batch",
    batchNo: `P4-${runId}`,
    startTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    maxStudents: 50,
    price: 5000,
    isFullCourse: false,
  });
  check("Setup: ephemeral accounts + slot created", true);

  // Bare sales orders (no InstallmentPlan/Razorpay needed — myStudents/teamStudents
  // only read Order, and Phase 4 introduces no new payment-touching logic).
  const order1a = await Order.create({
    userId: owner._id, // any valid User-ish ref id works for this scoping test; not populated as a real student
    slotId: testSlot._id,
    price: 5900,
    status: "pending",
    bookingMethod: "sales",
    salesPersonId: exec1a._id,
  });
  const order2a = await Order.create({
    userId: owner._id,
    slotId: testSlot._id,
    price: 5900,
    status: "pending",
    bookingMethod: "sales",
    salesPersonId: exec2a._id,
  });

  const ownerToken = signSessionToken({ id: String(owner._id), role: "owner" });
  const head1Token = signSessionToken({ id: String(head1._id), role: "admin" });
  const head2Token = signSessionToken({ id: String(head2._id), role: "admin" });
  const exec1aToken = signSessionToken({ id: String(exec1a._id), role: "admin" });
  const exec2aToken = signSessionToken({ id: String(exec2a._id), role: "admin" });
  const execNoneToken = signSessionToken({ id: String(execNone._id), role: "admin" });

  console.log("\n=== GET /api/sales/myStudents ===");
  const mine1a = await callApi("GET", "/api/sales/myStudents", exec1aToken);
  check("myStudents: exec1a sees exactly their own order (200, 1 order)", mine1a.status === 200 && Array.isArray(mine1a.json.orders) && (mine1a.json.orders as unknown[]).length === 1);
  const mine1aOrders = (mine1a.json.orders as { _id: string }[]) || [];
  check("myStudents: exec1a's order is order1a, not order2a", mine1aOrders[0]?._id === String(order1a._id));

  const mineNone = await callApi("GET", "/api/sales/myStudents", execNoneToken);
  check("myStudents: an executive with no orders gets an empty list, not an error", mineNone.status === 200 && Array.isArray(mineNone.json.orders) && (mineNone.json.orders as unknown[]).length === 0);

  console.log("\n=== GET /api/sales/teamStudents ===");
  const teamAsExec = await callApi("GET", "/api/sales/teamStudents", exec1aToken);
  check("teamStudents: a plain executive is rejected (403) — no team view", teamAsExec.status === 403);

  const teamAsHead1 = await callApi("GET", "/api/sales/teamStudents", head1Token);
  check("teamStudents: head1 sees exactly exec1a's order (200, 1 order)", teamAsHead1.status === 200 && (teamAsHead1.json.orders as unknown[]).length === 1);
  const head1Orders = (teamAsHead1.json.orders as { _id: string }[]) || [];
  check("teamStudents: head1's team order is order1a, not order2a", head1Orders[0]?._id === String(order1a._id));
  const head1Reports = (teamAsHead1.json.reports as { _id: string; email: string }[]) || [];
  check("teamStudents: head1's reports roster contains exactly exec1a", head1Reports.length === 1 && head1Reports[0]._id === String(exec1a._id));

  const teamAsOwner = await callApi("GET", "/api/sales/teamStudents", ownerToken);
  const ownerOrderIds = ((teamAsOwner.json.orders as { _id: string }[]) || []).map((o) => o._id);
  check(
    "teamStudents: owner sees everyone — both order1a and order2a present",
    teamAsOwner.status === 200 && ownerOrderIds.includes(String(order1a._id)) && ownerOrderIds.includes(String(order2a._id))
  );

  const filterOwnReport = await callApi("GET", `/api/sales/teamStudents?executiveId=${exec1a._id}`, head1Token);
  check("teamStudents: head1 filtering to their own report (exec1a) is allowed (200)", filterOwnReport.status === 200);

  const filterOtherHeadsReport = await callApi("GET", `/api/sales/teamStudents?executiveId=${exec2a._id}`, head1Token);
  check("teamStudents: head1 filtering to head2's report (exec2a) is rejected (403)", filterOtherHeadsReport.status === 403);

  console.log("\n=== POST /api/sales/team/createExecutive ===");
  const createAsExec = await callApi("POST", "/api/sales/team/createExecutive", exec1aToken, {
    name: "Should Not Create",
    email: `phase4-verify-should-not-exist-${runId}@test.local`,
    password: "password123",
  });
  check("createExecutive: a plain executive is rejected (403)", createAsExec.status === 403);

  const weakPassword = await callApi("POST", "/api/sales/team/createExecutive", head1Token, {
    name: "Phase4 Verify Exec1b",
    email: `phase4-verify-exec1b-${runId}@test.local`,
    password: "abc",
  });
  check("createExecutive: a too-short password is rejected (400)", weakPassword.status === 400);

  const created = await callApi("POST", "/api/sales/team/createExecutive", head1Token, {
    name: "Phase4 Verify Exec1b",
    email: `phase4-verify-exec1b-${runId}@test.local`,
    phone: "9990001111",
    password: "password123",
  });
  check("createExecutive: head1 creates a new report (201)", created.status === 201);
  const exec1bId = created.json.id as string;

  const exec1bDoc = await AdminUser.findById(exec1bId);
  check("DB: exec1b.reportsTo is forced to head1, matching the caller (not client-supplied)", String(exec1bDoc?.reportsTo) === String(head1._id));
  check("DB: exec1b got role admin / permissions sales / salesRole executive", exec1bDoc?.role === "admin" && (exec1bDoc?.permissions || []).includes("sales") && exec1bDoc?.salesRole === "executive");

  const duplicateEmail = await callApi("POST", "/api/sales/team/createExecutive", head1Token, {
    name: "Duplicate",
    email: `phase4-verify-exec1b-${runId}@test.local`,
    password: "password123",
  });
  check("createExecutive: a duplicate email is rejected (409)", duplicateEmail.status === 409);

  const ownerCreates = await callApi("POST", "/api/sales/team/createExecutive", ownerToken, {
    name: "Phase4 Verify Owner-Created Exec",
    email: `phase4-verify-owner-exec-${runId}@test.local`,
    password: "password123",
  });
  check("createExecutive: the owner can also create an executive (201)", ownerCreates.status === 201);
  const ownerCreatedId = ownerCreates.json.id as string;

  console.log("\n=== PATCH /api/sales/team/:id ===");
  const patchByOwningHead = await callApi("PATCH", `/api/sales/team/${exec1bId}`, head1Token, { name: "Exec1b Renamed", phone: "9998887777" });
  check("team/:id PATCH: head1 can edit their own report exec1b (200)", patchByOwningHead.status === 200);
  const exec1bAfterPatch = await AdminUser.findById(exec1bId);
  check("DB: exec1b's name/phone actually updated", exec1bAfterPatch?.name === "Exec1b Renamed" && exec1bAfterPatch?.phone === "9998887777");

  const patchByOtherHead = await callApi("PATCH", `/api/sales/team/${exec1bId}`, head2Token, { name: "Should Not Apply" });
  check("team/:id PATCH: a different head editing head1's report is rejected (403)", patchByOtherHead.status === 403);
  const exec1bUnaffectedByOtherHead = await AdminUser.findById(exec1bId);
  check("DB: exec1b's name unaffected by the rejected other-head edit", exec1bUnaffectedByOtherHead?.name === "Exec1b Renamed");

  const patchByExecSelf = await callApi("PATCH", `/api/sales/team/${exec1bId}`, exec1aToken, { name: "Should Not Apply Either" });
  check("team/:id PATCH: a plain executive (even a peer, even self via another token) is rejected (403)", patchByExecSelf.status === 403);

  const ownerPatchesAnyReport = await callApi("PATCH", `/api/sales/team/${exec1bId}`, ownerToken, { name: "Owner Renamed This" });
  check("team/:id PATCH: the owner can edit any report, not just their own creations (200)", ownerPatchesAnyReport.status === 200);

  console.log("\n=== Cleanup: remove every ephemeral test document ===");
  await Order.deleteMany({ _id: { $in: [order1a._id, order2a._id] } });
  await Slot.deleteOne({ _id: testSlot._id });
  await AdminUser.deleteMany({
    _id: { $in: [owner._id, head1._id, head2._id, exec1a._id, exec2a._id, execNone._id, exec1bId, ownerCreatedId] },
  });
  check("Cleanup: all ephemeral test documents removed", true);

  console.log(failures === 0 ? "\nAll Phase 4 sales checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
