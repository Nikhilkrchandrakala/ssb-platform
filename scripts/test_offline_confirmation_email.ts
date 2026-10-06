import fs from "fs";
import path from "path";

// Populate process.env BEFORE dynamically importing msg91
const envFiles = [".env.local", ".env"];
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

async function test() {
  const toEmail = process.argv[2] || process.env.TEST_EMAIL || "info@ssbwithisv.in";
  console.log(`[test] Sending test offline booking confirmation to: ${toEmail}...`);

  const { sendOfflineBookingConfirmationEmail } = await import("../src/server/integrations/msg91");

  const result = await sendOfflineBookingConfirmationEmail({
    to: toEmail,
    name: "Test Cadet",
    batchTitle: "Nagpur Batch 01",
    batchNo: "Batch #OFF-01-NGP-261026",
    startDate: "26 Oct 2026",
    location: "Nagpur",
    amountPaid: 5000,
    paymentId: "pay_test_" + Date.now().toString(36),
  });

  console.log("[test] Result:", result);
  if (result.delivered) {
    console.log("SUCCESS: Email was accepted and delivered by MSG91!");
  } else {
    console.log("NOTE: If MSG91 returned false, make sure the template 'offline_batch_booking' is APPROVED in the MSG91 dashboard.");
  }
}

test().catch(console.error);
