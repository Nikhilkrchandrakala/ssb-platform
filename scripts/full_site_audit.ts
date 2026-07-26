import fs from "fs";
import path from "path";
import { chromium, type Browser, type BrowserContext } from "@playwright/test";

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

const BASE_URL = process.env.AUDIT_BASE_URL || "http://localhost:3000";
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "ssb_session";

interface RouteCheck {
  url: string;
  as: string; // role/session label
}

interface Finding {
  url: string;
  as: string;
  status: number | "ERR";
  consoleErrors: string[];
  pageErrors: string[];
}

async function main() {
  const { connectDB } = await import("../src/server/db");
  const { signSessionToken } = await import("../src/server/auth");
  const { AdminUser } = await import("../src/server/models/AdminUser");
  const { Franchise } = await import("../src/server/models/Franchise");
  const { User } = await import("../src/server/models/User");
  const { Blog } = await import("../src/server/models/Blog");
  const { Assessment } = await import("../src/server/models/Assessment");
  const { Submission } = await import("../src/server/models/Submission");

  await connectDB();
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  console.log("=== Seeding disposable session accounts (one per role) ===");
  const owner = await AdminUser.create({
    name: "Audit Owner",
    email: `audit-owner-${runId}@test.local`,
    password: "x",
    role: "owner",
  });
  const fullAdmin = await AdminUser.create({
    name: "Audit Full Admin",
    email: `audit-admin-${runId}@test.local`,
    password: "x",
    role: "admin",
    permissions: [
      "dashboard", "magazine", "blogs", "gallery", "candidates", "courses",
      "franchise", "sales", "coupons", "admin", "leads", "roles", "allotment",
      "students", "evaluations",
    ],
  });
  const salesHead = await AdminUser.create({
    name: "Audit Sales Head",
    email: `audit-saleshead-${runId}@test.local`,
    password: "x",
    role: "admin",
    permissions: ["sales"],
    salesRole: "head",
  });
  const salesExec = await AdminUser.create({
    name: "Audit Sales Exec",
    email: `audit-salesexec-${runId}@test.local`,
    password: "x",
    role: "admin",
    permissions: ["sales"],
    salesRole: "executive",
    reportsTo: salesHead._id,
  });
  const assessor = await AdminUser.create({
    name: "Audit Assessor",
    email: `audit-assessor-${runId}@test.local`,
    password: "x",
    role: "assessor",
  });
  const franchise = await Franchise.create({
    name: "Audit Franchise",
    email: `audit-franchise-${runId}@test.local`,
    phone: "9990001111",
    referralCode: `AUDIT${runId.slice(-6)}`,
    password: "x",
  });
  const student = await User.create({
    name: "Audit Student",
    email: `audit-student-${runId}@test.local`,
    password: "x",
    role: "student",
    emailVerified: true,
    phoneVerified: true,
  });

  const tokens: Record<string, string> = {
    owner: signSessionToken({ id: String(owner._id), role: "owner" }),
    fullAdmin: signSessionToken({ id: String(fullAdmin._id), role: "admin" }),
    salesHead: signSessionToken({ id: String(salesHead._id), role: "admin" }),
    salesExec: signSessionToken({ id: String(salesExec._id), role: "admin" }),
    assessor: signSessionToken({ id: String(assessor._id), role: "assessor" }),
    franchise: signSessionToken({ id: String(franchise._id), role: "franchise" }),
    student: signSessionToken({ id: String(student._id), role: "student" }),
  };

  console.log("=== Looking up real sample IDs for dynamic routes ===");
  const sampleBlog = await Blog.findOne().sort({ createdAt: -1 }).lean();
  const sampleAssessment = await Assessment.findOne().sort({ createdAt: -1 }).lean();
  const sampleSubmission = await Submission.findOne().sort({ createdAt: -1 }).lean();
  console.log("  blog:", sampleBlog ? (sampleBlog as { slug?: string }).slug : "NONE FOUND");
  console.log("  assessment:", sampleAssessment ? String((sampleAssessment as { _id: unknown })._id) : "NONE FOUND");
  console.log("  submission:", sampleSubmission ? String((sampleSubmission as { _id: unknown })._id) : "NONE FOUND");

  const routes: RouteCheck[] = [
    // --- Public site (no session) ---
    { url: "/", as: "public" },
    { url: "/Batches", as: "public" },
    { url: "/Contactus", as: "public" },
    { url: "/Courses", as: "public" },
    { url: "/Gallery", as: "public" },
    { url: "/HalfOfFame", as: "public" },
    { url: "/Magazine", as: "public" },
    { url: "/PrivacyPolicy", as: "public" },
    { url: "/RefundCancellation", as: "public" },
    { url: "/SignIn", as: "public" },
    { url: "/SignUp", as: "public" },
    { url: "/TermsConditions", as: "public" },
    { url: "/aboutSSB", as: "public" },
    { url: "/aboutssbwithisv", as: "public" },
    { url: "/ssbVirtualTrainingXperience", as: "public" },
    { url: "/blogs", as: "public" },
    { url: "/AccountRecovery", as: "public" },
    { url: "/admin", as: "public" },
    { url: "/admin/AccountRecovery", as: "public" },
    ...(sampleBlog ? [{ url: `/blogs/${(sampleBlog as { slug?: string }).slug}`, as: "public" }] : []),

    // --- Student session ---
    { url: "/profile", as: "student" },
    { url: "/ProfileDashboard", as: "student" },
    { url: "/OrderHistory", as: "student" },
    { url: "/PaymentHistory", as: "student" },
    { url: "/Success", as: "student" },
    { url: "/Successful", as: "student" },

    // --- Owner: full admin panel ---
    { url: "/admin/dashboard", as: "owner" },
    { url: "/admin/Blogs", as: "owner" },
    { url: "/admin/BlogList", as: "owner" },
    { url: "/admin/CouponManagement", as: "owner" },
    { url: "/admin/Courses", as: "owner" },
    { url: "/admin/Franchise", as: "owner" },
    { url: "/admin/Gallery", as: "owner" },
    { url: "/admin/Profile", as: "owner" },
    { url: "/admin/RolesManagement", as: "owner" },
    { url: "/admin/Sales", as: "owner" },
    { url: "/admin/StudentRoster", as: "owner" },
    { url: "/admin/TotalSales", as: "owner" },
    { url: "/admin/all-users", as: "owner" },
    { url: "/admin/candidate", as: "owner" },
    { url: "/admin/leads", as: "owner" },
    { url: "/admin/magazine", as: "owner" },
    { url: "/admin/Allotment", as: "owner" },

    // --- Full-permission admin (non-owner) sanity spot-check ---
    { url: "/admin/dashboard", as: "fullAdmin" },
    { url: "/admin/Sales", as: "fullAdmin" },
    { url: "/admin/TotalSales", as: "fullAdmin" },

    // --- Sales Head ---
    { url: "/admin/Sales", as: "salesHead" },
    { url: "/admin/TotalSales", as: "salesHead" },
    { url: "/admin/Profile", as: "salesHead" },

    // --- Sales Executive (junior — should NOT see TotalSales; verifying today's fix) ---
    { url: "/admin/Sales", as: "salesExec" },
    { url: "/admin/TotalSales", as: "salesExec" },
    { url: "/admin/Profile", as: "salesExec" },

    // --- Franchise ---
    { url: "/admin/FranchiseDashboard", as: "franchise" },
    { url: "/admin/Profile", as: "franchise" },

    // --- Assessor / psych-battery ---
    { url: "/psych-battery", as: "assessor" },
    { url: "/psych-battery/assessor", as: "assessor" },
    { url: "/psych-battery/meetings", as: "assessor" },
    { url: "/admin/Profile", as: "assessor" },
    ...(sampleSubmission
      ? [
          { url: `/psych-battery/review/${String((sampleSubmission as { _id: unknown })._id)}`, as: "assessor" },
        ]
      : []),

    // --- Owner viewing psych-battery admin surfaces ---
    { url: "/psych-battery/admin", as: "owner" },
    ...(sampleAssessment
      ? [
          { url: `/psych-battery/admin/assessment/${String((sampleAssessment as { _id: unknown })._id)}`, as: "owner" },
          { url: `/psych-battery/presentation/${String((sampleAssessment as { _id: unknown })._id)}`, as: "owner" },
        ]
      : []),

    // --- Student in psych-battery ---
    { url: "/psych-battery", as: "student" },
    ...(sampleAssessment
      ? [{ url: `/psych-battery/assessment/${String((sampleAssessment as { _id: unknown })._id)}`, as: "student" }]
      : []),
    ...(sampleSubmission
      ? [{ url: `/psych-battery/upload/${String((sampleSubmission as { _id: unknown })._id)}`, as: "student" }]
      : []),
  ];

  console.log(`\n=== Crawling ${routes.length} route/role combinations against ${BASE_URL} ===\n`);

  const browser: Browser = await chromium.launch();
  const contexts: Record<string, BrowserContext> = {};
  const getContext = async (as: string) => {
    if (contexts[as]) return contexts[as];
    const ctx = await browser.newContext();
    if (as !== "public" && tokens[as]) {
      await ctx.addCookies([
        {
          name: SESSION_COOKIE_NAME,
          value: tokens[as],
          domain: "localhost",
          path: "/",
          httpOnly: true,
        },
      ]);
    }
    contexts[as] = ctx;
    return ctx;
  };

  const findings: Finding[] = [];

  for (const route of routes) {
    const ctx = await getContext(route.as);
    const page = await ctx.newPage();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
    });
    page.on("pageerror", (err) => {
      pageErrors.push(String(err.message || err).slice(0, 300));
    });

    let status: number | "ERR" = "ERR";
    try {
      const res = await page.goto(`${BASE_URL}${route.url}`, { waitUntil: "networkidle", timeout: 20000 });
      status = res?.status() ?? "ERR";
      // Give client components a beat to throw any deferred hydration errors.
      await page.waitForTimeout(400);
    } catch (err) {
      pageErrors.push(`goto failed: ${String(err instanceof Error ? err.message : err).slice(0, 200)}`);
    }

    findings.push({ url: route.url, as: route.as, status, consoleErrors, pageErrors });
    console.log(
      `[${route.as.padEnd(9)}] ${String(status).padEnd(4)} ${route.url}` +
        (consoleErrors.length || pageErrors.length ? "  <-- ISSUES" : "")
    );
    await page.close();
  }

  for (const ctx of Object.values(contexts)) await ctx.close();
  await browser.close();

  console.log("\n\n=== SUMMARY: routes with non-2xx/3xx status or console/page errors ===\n");
  const problems = findings.filter(
    (f) => f.status === "ERR" || (typeof f.status === "number" && f.status >= 400) || f.consoleErrors.length || f.pageErrors.length
  );
  if (problems.length === 0) {
    console.log("None. Every crawled route returned a healthy status with zero console/page errors.");
  } else {
    for (const p of problems) {
      console.log(`\n--- [${p.as}] ${p.url} (status ${p.status}) ---`);
      for (const e of p.consoleErrors) console.log("  console.error:", e);
      for (const e of p.pageErrors) console.log("  pageerror:", e);
    }
  }

  console.log(`\n\nTotal routes crawled: ${findings.length}. Problem routes: ${problems.length}.`);

  console.log("\n=== Cleanup: removing disposable audit accounts ===");
  await AdminUser.deleteMany({ _id: { $in: [owner._id, fullAdmin._id, salesHead._id, salesExec._id, assessor._id] } });
  await Franchise.deleteOne({ _id: franchise._id });
  await User.deleteOne({ _id: student._id });
  console.log("Done.");

  process.exit(problems.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
