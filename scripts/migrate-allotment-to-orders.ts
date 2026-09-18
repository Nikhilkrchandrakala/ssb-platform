// One-off migration: copies assessor allotment (assignedGTO/TO/Psych/IO +
// assignedAssessments) from User onto that student's most recent paid
// Order, and attaches orderId to any Submission missing one. Additive only
// — never clears/deletes the User-level fields, so it's safe to re-run
// (idempotent: skips an Order that already has an assignment set).
//
// Run with: npx tsx scripts/migrate-allotment-to-orders.ts

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

async function main() {
  const { connectDB } = await import("../src/server/db");
  const { User } = await import("../src/server/models/User");
  const { Order } = await import("../src/server/models/Order");
  const { Submission } = await import("../src/server/models/Submission");

  await connectDB();

  console.log("=== Migrating assessor allotment: User -> most recent paid Order ===");
  const usersWithAllotment = await User.find({
    $or: [
      { assignedGTO: { $ne: null } },
      { assignedTO: { $ne: null } },
      { assignedPsych: { $ne: null } },
      { assignedIO: { $ne: null } },
      { assignedAssessments: { $exists: true, $not: { $size: 0 } } },
    ],
  }).select("_id name assignedGTO assignedTO assignedPsych assignedIO assignedAssessments");

  console.log(`Found ${usersWithAllotment.length} student(s) with an existing allotment.`);

  let migrated = 0;
  let alreadySet = 0;
  let noOrderFound = 0;

  for (const u of usersWithAllotment) {
    const latestOrder = await Order.findOne({ userId: u._id, status: "paid" }).sort({ createdAt: -1 });
    if (!latestOrder) {
      console.warn(`  [no paid order] ${u.name} (${u._id}) has an allotment but no paid Order to attach it to — left as-is on User.`);
      noOrderFound++;
      continue;
    }

    const orderHasAllotment =
      latestOrder.assignedGTO || latestOrder.assignedTO || latestOrder.assignedPsych || latestOrder.assignedIO;
    if (orderHasAllotment) {
      alreadySet++;
      continue;
    }

    latestOrder.assignedGTO = u.assignedGTO;
    latestOrder.assignedTO = u.assignedTO;
    latestOrder.assignedPsych = u.assignedPsych;
    latestOrder.assignedIO = u.assignedIO;
    latestOrder.assignedAssessments = u.assignedAssessments || [];
    await latestOrder.save();
    migrated++;
  }

  console.log(`Allotment migration done: ${migrated} migrated, ${alreadySet} already had an Order-level allotment, ${noOrderFound} had no paid Order.`);

  console.log("\n=== Attaching orderId to Submissions missing one ===");
  const submissionsMissingOrder = await Submission.find({ orderId: null }).select("_id userId");
  console.log(`Found ${submissionsMissingOrder.length} submission(s) without an orderId.`);

  let submissionsMigrated = 0;
  let submissionsNoOrderFound = 0;

  for (const sub of submissionsMissingOrder) {
    const latestOrder = await Order.findOne({ userId: sub.userId, status: "paid" }).sort({ createdAt: -1 });
    if (!latestOrder) {
      submissionsNoOrderFound++;
      continue;
    }
    sub.orderId = latestOrder._id;
    await sub.save();
    submissionsMigrated++;
  }

  console.log(`Submission migration done: ${submissionsMigrated} attached, ${submissionsNoOrderFound} had no paid Order.`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
