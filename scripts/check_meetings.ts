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
  const { Submission } = await import("../src/server/models/Submission");

  await connectDB();
  console.log("=== CHECKING ASSESSORS IN DATABASE ===");
  const assessors = await User.find({ role: "assessor" });
  for (const a of assessors) {
    console.log(`Assessor: ${a.name} (${a.email}) | assessorType: ${a.assessorType} | _id: ${a._id}`);
  }

  console.log("\n=== CHECKING SUBMISSIONS WITH MEETING FIELDS ===");
  const submissions = await Submission.find({
    $or: [
      { psychMeetingDate: { $ne: null } },
      { toMeetingDate: { $ne: null } },
      { gtoMeetingDate: { $ne: null } },
      { ioMeetingDate: { $ne: null } },
      { meetingDate: { $ne: null } },
      { psychMeetingLink: { $nin: [null, ""] } },
      { toMeetingLink: { $nin: [null, ""] } },
      { gtoMeetingLink: { $nin: [null, ""] } },
      { ioMeetingLink: { $nin: [null, ""] } },
      { meetingLink: { $nin: [null, ""] } },
    ],
  }).populate("userId", "name email assignedPsych assignedGTO assignedIO assignedTO");

  console.log(`Found ${submissions.length} submission(s) with meeting data:`);
  for (const sub of submissions) {
    const s = sub as unknown as Record<string, unknown>;
    console.log(`\nSubmission _id: ${s._id} | Student: ${JSON.stringify(s.userId)}`);
    console.log(`  psychMeetingDate: ${s.psychMeetingDate} | psychMeetingLink: ${s.psychMeetingLink}`);
    console.log(`  gtoMeetingDate: ${s.gtoMeetingDate} | gtoMeetingLink: ${s.gtoMeetingLink}`);
    console.log(`  ioMeetingDate: ${s.ioMeetingDate} | ioMeetingLink: ${s.ioMeetingLink}`);
    console.log(`  toMeetingDate: ${s.toMeetingDate} | toMeetingLink: ${s.toMeetingLink}`);
    console.log(`  meetingDate (general): ${s.meetingDate} | meetingLink (general): ${s.meetingLink}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
