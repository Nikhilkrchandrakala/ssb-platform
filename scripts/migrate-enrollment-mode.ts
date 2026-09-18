// One-off backfill: re-derives User.enrollmentMode from that student's most
// recent paid Order (via that order's Slot.mode) for every student with at
// least one paid Order. Fixes accounts that got permanently stuck as
// "offline" because verifyPayment.ts used to only ever SET this field to
// "offline" and never reset it back to "online" on a later purchase (and
// manualBookSlot never touched it at all). Idempotent — safe to re-run;
// only writes when the derived value actually differs from what's stored.
//
// Run with: npx tsx scripts/migrate-enrollment-mode.ts

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

async function main() {
  const { connectDB } = await import("../src/server/db");
  const { User } = await import("../src/server/models/User");
  const { Order } = await import("../src/server/models/Order");
  await import("../src/server/models/Slot");

  await connectDB();

  const studentUserIds = await Order.distinct("userId", { status: "paid" });
  console.log(`Found ${studentUserIds.length} students with at least one paid order.`);

  let checked = 0;
  let fixed = 0;
  let skippedNoSlot = 0;

  for (const userId of studentUserIds) {
    checked++;
    const mostRecentPaidOrder = await Order.findOne({ userId, status: "paid" })
      .sort({ createdAt: -1 })
      .populate("slotId", "mode");
    const slot = mostRecentPaidOrder?.slotId as unknown as { mode?: string } | null;
    if (!slot) {
      skippedNoSlot++;
      continue;
    }
    const derivedMode = slot.mode === "offline" ? "offline" : "online";

    const user = await User.findById(userId).select("enrollmentMode name email");
    if (!user) continue;
    if (user.enrollmentMode === derivedMode) continue;

    console.log(`Fixing ${user.name} (${user.email}): ${user.enrollmentMode || "online"} -> ${derivedMode}`);
    user.enrollmentMode = derivedMode;
    await user.save();
    fixed++;
  }

  console.log(`\nDone. Checked: ${checked}, fixed: ${fixed}, skipped (no populated slot): ${skippedNoSlot}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
