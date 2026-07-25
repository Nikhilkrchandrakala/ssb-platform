import fs from "fs";
import path from "path";

// Same env-loading pattern as the phaseN_sales_verify.ts scripts.
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

  await connectDB();

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const emailFor = (label: string) => `roles-sales-verify-${label}-${runId}@test.local`;

  console.log("=== Setup: a temp owner (never the real protected account) ===");
  const owner = await AdminUser.create({
    name: "Roles Verify Owner",
    email: emailFor("owner"),
    password: "not-used-jwt-minted-directly",
    role: "owner",
  });
  const ownerToken = signSessionToken({ id: String(owner._id), role: "owner" });

  try {
    console.log("\n=== A. Create a Sales Head via /api/admin/users/new/role ===");
    const headEmail = emailFor("head");
    const createHead = await callApi("PUT", "/api/admin/users/new/role", ownerToken, {
      role: "admin",
      email: headEmail,
      name: "Verify Head",
      phone: "9990000001",
      password: "password123",
      permissions: [],
      salesRole: "head",
      reportsTo: null,
    });
    check("create Sales Head -> 200", createHead.status === 200);
    const headDoc = await AdminUser.findOne({ email: headEmail });
    check("Head persisted with salesRole=head", headDoc?.salesRole === "head");

    console.log("\n=== B. Create a Sales Executive reporting to that Head ===");
    const execEmail = emailFor("exec");
    const createExec = await callApi("PUT", "/api/admin/users/new/role", ownerToken, {
      role: "admin",
      email: execEmail,
      name: "Verify Exec",
      phone: "9990000002",
      password: "password123",
      permissions: [],
      salesRole: "executive",
      reportsTo: String(headDoc!._id),
    });
    check("create Sales Executive reporting to Head -> 200", createExec.status === 200);
    const execDoc = await AdminUser.findOne({ email: execEmail });
    check("Executive persisted with correct reportsTo", String(execDoc?.reportsTo) === String(headDoc!._id));

    console.log("\n=== C. GET /api/admin/users exposes salesRole/reportsTo ===");
    const listRes = await callApi("GET", "/api/admin/users", ownerToken);
    const users = (listRes.json.users as Array<Record<string, unknown>>) || [];
    const headRow = users.find((u) => u.email === headEmail);
    const execRow = users.find((u) => u.email === execEmail);
    check("list exposes Head's salesRole", headRow?.salesRole === "head");
    check("list exposes Executive's salesRole + reportsTo", execRow?.salesRole === "executive" && execRow?.reportsTo === String(headDoc!._id));

    console.log("\n=== D. Negative: Executive with no reportsTo is rejected ===");
    const noReportsTo = await callApi("PUT", "/api/admin/users/new/role", ownerToken, {
      role: "admin",
      email: emailFor("exec-noreport"),
      name: "No Report Exec",
      password: "password123",
      permissions: [],
      salesRole: "executive",
      reportsTo: null,
    });
    check("executive with no reportsTo -> 400", noReportsTo.status === 400);

    console.log("\n=== E. Negative: reportsTo pointing at a non-Head account is rejected ===");
    const badReportsTo = await callApi("PUT", "/api/admin/users/new/role", ownerToken, {
      role: "admin",
      email: emailFor("exec-badreport"),
      name: "Bad Report Exec",
      password: "password123",
      permissions: [],
      salesRole: "executive",
      reportsTo: String(execDoc!._id), // exec1 is not a Head
    });
    check("executive reporting to a non-Head -> 400", badReportsTo.status === 400);

    console.log("\n=== F. Negative: demoting a Head that still has a report is blocked ===");
    const demoteHead = await callApi("PUT", `/api/admin/users/${headDoc!._id}/role`, ownerToken, {
      role: "admin",
      email: headEmail,
      name: "Verify Head",
      password: "",
      permissions: [],
      salesRole: null,
      reportsTo: null,
    });
    check("demoting a Head with active reports -> 400", demoteHead.status === 400);

    console.log("\n=== G. Reassign the executive away, then demoting the Head succeeds ===");
    const reassignExec = await callApi("PUT", `/api/admin/users/${execDoc!._id}/role`, ownerToken, {
      role: "franchise",
      email: execEmail,
      name: "Verify Exec",
      password: "",
      commissionPercent: 20,
    });
    check("reassign executive to franchise -> 200", reassignExec.status === 200);

    const demoteHeadAgain = await callApi("PUT", `/api/admin/users/${headDoc!._id}/role`, ownerToken, {
      role: "admin",
      email: headEmail,
      name: "Verify Head",
      password: "",
      permissions: [],
      salesRole: null,
      reportsTo: null,
    });
    check("demoting the now-report-free Head -> 200", demoteHeadAgain.status === 200);
  } finally {
    console.log("\n=== Cleanup ===");
    const { Franchise } = await import("../src/server/models/Franchise");
    await AdminUser.deleteMany({ email: { $regex: runId } });
    await Franchise.deleteMany({ email: { $regex: runId } });
    console.log("Deleted all ephemeral test documents.");
  }

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
