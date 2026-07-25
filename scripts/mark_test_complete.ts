import fs from "fs";
import path from "path";

// Populate process.env BEFORE dynamically importing any backend server modules
const envFiles = [".env.local", ".env", "env", ".env.development"];
for (const envFile of envFiles) {
  const file = path.join(process.cwd(), envFile);
  if (fs.existsSync(file)) {
    console.log(`Loading environment variables from: ${envFile}`);
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
  if (!process.env.MONGODB_URI) {
    console.error("ERROR: MONGODB_URI could not be found in any env file!");
    process.exit(1);
  }

  console.log("Connecting to database using loaded MONGODB_URI...");
  // Dynamically import database and models so MONGODB_URI is already defined in process.env
  const { connectDB } = await import("../src/server/db");
  const { User } = await import("../src/server/models/User");
  const { Submission } = await import("../src/server/models/Submission");
  const { Assessment } = await import("../src/server/models/Assessment");

  await connectDB();
  const email = "ayushtripathi1604@gmail.com";
  const user = await User.findOne({ email: new RegExp(`^${email}$`, "i") });
  if (!user) {
    console.error("User not found in database:", email);
    process.exit(1);
  }
  console.log("Found user:", user.name, `(_id: ${user._id})`);

  // Ensure user profile meets all eligibility criteria for dossier upload step
  let userUpdated = false;
  if (!user.batch || user.batch.trim() === "") {
    user.batch = "Test Batch 101";
    userUpdated = true;
    console.log("- Assigned default test batch");
  }
  if (!user.assignedPsych) {
    const assessor = await User.findOne({ role: "assessor" });
    user.assignedPsych = assessor ? assessor._id : user._id;
    userUpdated = true;
    console.log("- Assigned psych assessor for test evaluations");
  }
  if (!user.clinicalStage || !user.clinicalStage.includes("full_course")) {
    user.clinicalStage = user.clinicalStage ? `${user.clinicalStage}, full_course` : "full_course";
    userUpdated = true;
    console.log("- Ensured full_course stage is present on profile");
  }
  if (userUpdated) {
    await user.save();
  }

  // Locate existing submission or create one if candidate hasn't started
  let submission = await Submission.findOne({ userId: user._id }).sort({ _id: -1 });
  if (!submission) {
    let assessment = await Assessment.findOne({ active: true });
    if (!assessment) {
      assessment = await Assessment.findOne({});
    }
    if (!assessment) {
      console.log("No assessment found in database, generating default test assessment...");
      assessment = await Assessment.create({
        title: "Standard Psychological Battery",
        description: "Timed psychological evaluation test battery",
        type: "GENERAL",
        active: true,
        duration: 60,
      });
    }
    console.log("- Creating new submission for assessment:", assessment.title);
    submission = await Submission.create({
      userId: user._id,
      assessmentId: assessment._id,
      startedAt: new Date(),
    });
  } else {
    console.log(`- Found existing submission (_id: ${submission._id})`);
  }

  // Update submission status to reflect a completed psychological test ready for dossier upload
  submission.status = "PENDING_UPLOAD";
  submission.workflowStage = "EVALUATION_COMPLETED";
  submission.completedAt = new Date();

  // Ensure PIQ forms are marked verified so step 4 (Dossier Upload) is accessible and ready
  if (!submission.piq1Status || submission.piq1Status === "PENDING") submission.piq1Status = "VERIFIED";
  if (!submission.piq2Status || submission.piq2Status === "PENDING") submission.piq2Status = "VERIFIED";
  if (!submission.piqFiles || submission.piqFiles.length === 0) {
    submission.piqFiles = ["/dummy/piq1_test.pdf", "/dummy/piq2_test.pdf"];
  }

  await submission.save();
  console.log("\n✅ SUCCESS: Psychological evaluation test for ayushtripathi1604@gmail.com is now marked as complete!");
  console.log("You can immediately proceed to testing the Dossier Upload step in your Profile Dashboard.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error during execution:", err);
  process.exit(1);
});
