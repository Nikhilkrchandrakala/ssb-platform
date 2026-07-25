import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

// Superset of the main backend's `UserDetails` schema and psych_battery's
// slimmer `User` schema — both already read/write the same `users` collection
// in production (that's how psych-battery's SSO worked), so this merges every
// field either side relied on rather than picking one.
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, unique: true, sparse: true },
    password: { type: String }, // absent for OAuth users

    oauthProvider: { type: String, enum: ["google", "facebook", "linkedin", null], default: null },
    oauthId: { type: String, default: null },

    zohoFormFilled: { type: Boolean, default: false },
    Address: { type: String },
    profileImage: { type: String },
    emailVerified: { type: Boolean, default: true },
    phoneVerified: { type: Boolean, default: true },

    // Not an enum: legacy data includes 'lead', 'student', 'assessor', 'admin', 'owner', 'franchise'.
    role: { type: String, default: "lead" },

    assessorType: { type: String, enum: ["GTO", "TO", "Psych", "IO", null], default: null },
    clinicalStage: { type: String, default: null },
    batch: { type: String, default: "" },
    chestNo: { type: String, default: "" },
    isManuallyCreated: { type: Boolean, default: false },

    assignedGTO: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedTO: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedPsych: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedIO: { type: Schema.Types.ObjectId, ref: "User", default: null },
    // Legacy psych_battery field kept for compatibility with any existing documents.
    assignedAssessor: { type: Schema.Types.ObjectId, ref: "User" },

    assignedAssessments: { type: [{ type: Schema.Types.ObjectId, ref: "Assessment" }], default: [] },

    hasPsychTheoryConsent: { type: Boolean, default: false },
    psychTestAttemptedAt: { type: Date, default: null },

    downloadedMagazines: {
      type: [
        {
          magazineId: { type: Schema.Types.ObjectId, ref: "MagazinePdf", required: true },
          downloadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    // Extended SSB profile fields.
    dob: { type: String, default: "" },
    ssbAspirant: { type: String, default: "" },
    servingCandidate: { type: String, default: "" },
    vtxHeard: { type: String, default: "" },
    youtubeSubscribed: { type: String, default: "" },
    podcastSubscribed: { type: String, default: "" },
    ssbExperience: { type: String, default: "" },
    nextSsbDate: { type: String, default: "" },
    ssbBoards: { type: [String], default: [] },
    ssbEntries: { type: [String], default: [] },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.password) return; // OAuth user
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Keep `_id` (legacy site/admin code reads it directly) and also expose `id`
// (psych-battery code reads `.id`), and never leak the password hash.
userSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    delete ret.password;
    return ret;
  },
});

export const User = mongoose.models.User || mongoose.model("User", userSchema);
