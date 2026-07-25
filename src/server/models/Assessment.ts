import mongoose, { Schema } from "mongoose";

// psych_battery's schema is the richer/actively-used one (module timing config
// drives the AssessmentEditor UI) — the main backend's `Assessment.js` was a
// bare subset of the same `assessments` collection, so it's dropped in favor
// of this superset.
const moduleConfigSchema = new Schema(
  {
    timingMode: { type: String, enum: ["per-slide", "global"], default: "per-slide" },
    globalDuration: { type: Number, default: 0 },
    navigable: { type: Boolean, default: false },
  },
  { _id: false }
);

const assessmentSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    type: { type: String, enum: ["TAT", "WAT", "SRT", "SDT", "GENERAL"], default: "GENERAL" },
    instructions: String,
    duration: Number,
    active: { type: Boolean, default: false },
    allowCandidateSkip: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    modules: {
      type: Map,
      of: moduleConfigSchema,
      default: () =>
        new Map([
          ["INTRO", { timingMode: "per-slide", globalDuration: 0, navigable: false }],
          ["TAT", { timingMode: "per-slide", globalDuration: 0, navigable: false }],
          ["WAT", { timingMode: "per-slide", globalDuration: 0, navigable: false }],
          ["WAT_INST", { timingMode: "per-slide", globalDuration: 0, navigable: false }],
          ["SRT_INST", { timingMode: "per-slide", globalDuration: 0, navigable: false }],
          ["SRT", { timingMode: "global", globalDuration: 1800, navigable: true }],
          ["SDT_INST", { timingMode: "per-slide", globalDuration: 0, navigable: false }],
          ["SDT", { timingMode: "per-slide", globalDuration: 0, navigable: false }],
          ["CLOSING", { timingMode: "per-slide", globalDuration: 0, navigable: false }],
        ]),
    },
  },
  { collection: "assessments", timestamps: true }
);

assessmentSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    if (ret.modules instanceof Map) {
      const obj: Record<string, unknown> = {};
      ret.modules.forEach((val, key) => {
        obj[key] = val;
      });
      ret.modules = obj;
    }
    return ret;
  },
});

export const Assessment = mongoose.models.Assessment || mongoose.model("Assessment", assessmentSchema);
