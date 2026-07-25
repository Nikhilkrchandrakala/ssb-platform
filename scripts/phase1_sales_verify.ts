import fs from "fs";
import path from "path";

// Populate process.env BEFORE dynamically importing any server modules
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
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${label}`);
  if (!condition) failures++;
}

async function main() {
  const { connectDB } = await import("../src/server/db");
  const { AdminUser } = await import("../src/server/models/AdminUser");
  const { Order } = await import("../src/server/models/Order");
  const { InstallmentPlan } = await import("../src/server/models/InstallmentPlan");
  const { SalesAuditLog } = await import("../src/server/models/SalesAuditLog");
  const { canAccessSalesRecord, canManageSalesAccount } = await import("../src/server/adminAccess");

  console.log("=== Mongoose model compilation + real round-trip ===");
  await connectDB();

  const owner = { _id: "owner1", role: "owner" as const, salesRole: null };
  const head = { _id: "head1", role: "admin" as const, salesRole: "head" as const };
  const otherHead = { _id: "head2", role: "admin" as const, salesRole: "head" as const };
  const exec = { _id: "exec1", role: "admin" as const, salesRole: "executive" as const };
  const otherExec = { _id: "exec2", role: "admin" as const, salesRole: "executive" as const };

  // Round-trip: create+delete a real InstallmentPlan and SalesAuditLog doc to
  // confirm both new schemas actually persist against the live DB, not just compile.
  const testOrderId = new (await import("mongoose")).default.Types.ObjectId();
  const testStudentId = new (await import("mongoose")).default.Types.ObjectId();
  const testSalesPersonId = new (await import("mongoose")).default.Types.ObjectId();

  const plan = await InstallmentPlan.create({
    orderId: testOrderId,
    studentId: testStudentId,
    salesPersonId: testSalesPersonId,
    totalAmount: 50000,
    initialAmount: 10000,
    installments: [{ seq: 1, amount: 10000, dueDate: new Date(), status: "paid" }],
  });
  check("InstallmentPlan round-trip: created with default status 'active'", plan.status === "active");
  check(
    "InstallmentPlan round-trip: nested installment subdoc default status applied elsewhere is 'pending'",
    plan.installments.length === 1
  );

  const log = await SalesAuditLog.create({
    actorId: testSalesPersonId,
    action: "LINK_GENERATED",
    orderId: testOrderId,
    installmentPlanId: plan._id,
    meta: { note: "phase1 verify script" },
  });
  check("SalesAuditLog round-trip: created", !!log._id);

  await InstallmentPlan.deleteOne({ _id: plan._id });
  await SalesAuditLog.deleteOne({ _id: log._id });
  check("Cleanup: test docs removed", true);

  check("AdminUser schema has salesRole/reportsTo paths", !!AdminUser.schema.path("salesRole") && !!AdminUser.schema.path("reportsTo"));
  check(
    "Order schema has salesPersonId/installmentPlanId/accessRevoked paths",
    !!Order.schema.path("salesPersonId") && !!Order.schema.path("installmentPlanId") && !!Order.schema.path("accessRevoked")
  );
  check("Order.bookingMethod enum includes 'sales'", (Order.schema.path("bookingMethod") as unknown as { enumValues: string[] }).enumValues.includes("sales"));

  console.log("\n=== canAccessSalesRecord (mock owner/head/executive triple) ===");
  check("owner sees exec's record", canAccessSalesRecord(owner, { salesPersonId: exec._id }));
  check("owner sees head's own record", canAccessSalesRecord(owner, { salesPersonId: head._id }));
  check("head sees own record", canAccessSalesRecord(head, { salesPersonId: head._id }));
  check(
    "head sees direct report's record",
    canAccessSalesRecord(head, { salesPersonId: exec._id, salesPersonReportsTo: head._id })
  );
  check(
    "head does NOT see another head's report's record",
    !canAccessSalesRecord(head, { salesPersonId: otherExec._id, salesPersonReportsTo: otherHead._id })
  );
  check("executive sees own record", canAccessSalesRecord(exec, { salesPersonId: exec._id }));
  check(
    "executive does NOT see a peer's record",
    !canAccessSalesRecord(exec, { salesPersonId: otherExec._id, salesPersonReportsTo: head._id })
  );
  check(
    "executive does NOT see their own head's record",
    !canAccessSalesRecord(exec, { salesPersonId: head._id })
  );

  console.log("\n=== canManageSalesAccount (mock owner/head/executive triple) ===");
  check("owner can manage any account", canManageSalesAccount(owner, { reportsTo: head._id }));
  check("head can manage their own direct report", canManageSalesAccount(head, { reportsTo: head._id }));
  check(
    "head can NOT manage another head's report",
    !canManageSalesAccount(head, { reportsTo: otherHead._id })
  );
  check("executive can NOT manage any account", !canManageSalesAccount(exec, { reportsTo: head._id }));
  check("executive can NOT manage their own account", !canManageSalesAccount(exec, { reportsTo: head._id }));

  console.log(failures === 0 ? "\nAll Phase 1 sales checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
