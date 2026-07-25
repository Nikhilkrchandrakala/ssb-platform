import mongoose, { Schema } from "mongoose";

const submissionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: "Assessment", required: true },
    status: { type: String, default: "NOT_STARTED" },
    startedAt: Date,
    completedAt: Date,
    uploadedFiles: [String],
    piqFiles: [String],
    piqFileData: [
      {
        filename: String,
        mimetype: String,
        data: String, // base64 — legacy Vercel-filesystem workaround, superseded by R2 in Phase 2
        piqType: { type: String, enum: ["piq1", "piq2"], default: "piq1" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    piqParsedData: String,
    piqStatus: { type: String, enum: ["PENDING", "PROCESSING", "PARSED", "FAILED"], default: "PENDING" },
    piq1Status: { type: String, enum: ["PENDING", "PROCESSING", "VERIFIED", "FAILED"], default: "PENDING" },
    piq2Status: { type: String, enum: ["PENDING", "PROCESSING", "VERIFIED", "FAILED"], default: "PENDING" },

    assessorId: { type: Schema.Types.ObjectId, ref: "User" },
    assessorRemarks: String,
    evaluation: String,
    psychScores: Map,
    gtoScores: Map,
    ioScores: Map,
    toScores: Map,
    score: Number,

    meetingDate: Date,
    meetingLink: String,
    psychMeetingDate: Date,
    psychMeetingLink: String,
    psychMeetingCompleted: { type: Boolean, default: false },
    ioMeetingDate: Date,
    ioMeetingLink: String,
    ioMeetingCompleted: { type: Boolean, default: false },
    gtoMeetingDate: Date,
    gtoMeetingLink: String,
    gtoMeetingCompleted: { type: Boolean, default: false },
    toMeetingDate: Date,
    toMeetingLink: String,
    toMeetingCompleted: { type: Boolean, default: false },

    finalReport: String,
    reviewedAt: Date,

    psychRemarks: { type: String, default: "" },
    psychStatus: { type: String, enum: ["PENDING", "UNDER_REVIEW", "COMPLETED", "NOT_REQUIRED"], default: "PENDING" },
    gtoRemarks: { type: String, default: "" },
    gtoStatus: { type: String, enum: ["PENDING", "UNDER_REVIEW", "COMPLETED", "NOT_REQUIRED"], default: "PENDING" },
    ioRemarks: { type: String, default: "" },
    ioStatus: { type: String, enum: ["PENDING", "UNDER_REVIEW", "COMPLETED", "NOT_REQUIRED"], default: "PENDING" },
    toRemarks: { type: String, default: "" },
    toStatus: { type: String, enum: ["PENDING", "UNDER_REVIEW", "COMPLETED", "NOT_REQUIRED"], default: "PENDING" },

    releasedPsychRemarks: { type: String, default: "" },
    releasedGtoRemarks: { type: String, default: "" },
    releasedIoRemarks: { type: String, default: "" },
    releasedToRemarks: { type: String, default: "" },

    workflowStage: { type: String, default: "PIQ_PENDING" },
    reportVisibility: {
      psych: { type: Boolean, default: false },
      io: { type: Boolean, default: false },
      gto: { type: Boolean, default: false },
      to: { type: Boolean, default: false },
    },
    adminApproval: {
      approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
      approvedAt: Date,
      remarks: String,
    },
  },
  { timestamps: true }
);

submissionSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    return ret;
  },
});

export const Submission = mongoose.models.Submission || mongoose.model("Submission", submissionSchema);
