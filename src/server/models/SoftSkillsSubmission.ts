import mongoose, { Schema } from "mongoose";

export interface ISoftSkillsSubmission {
  userId: mongoose.Types.ObjectId;
  slotId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId | null;
  video1Url?: string;
  video1Id?: string;
  video1SubmittedAt?: Date | null;
  video2Unlocked: boolean;
  video2UnlockedAt?: Date | null;
  video2UnlockedBy?: mongoose.Types.ObjectId | null;
  video2Url?: string;
  video2Id?: string;
  video2SubmittedAt?: Date | null;
  status: "PENDING" | "REVIEW_PENDING" | "COMPLETED";
  feedback?: string;
  reviewedAt?: Date | null;
  reviewedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const softSkillsSubmissionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    slotId: { type: Schema.Types.ObjectId, ref: "Slot", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },

    // Video 1: Baseline Introduction Speech (Day 1 / Entry)
    video1Url: { type: String, default: "" },
    video1Id: { type: String, default: "" },
    video1SubmittedAt: { type: Date, default: null },

    // Video 2: Exit Capstone Speech (Week 4 / Final)
    // Initially locked; unlocked by mentor per candidate or batch-wide.
    video2Unlocked: { type: Boolean, default: false },
    video2UnlockedAt: { type: Date, default: null },
    video2UnlockedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    video2Url: { type: String, default: "" },
    video2Id: { type: String, default: "" },
    video2SubmittedAt: { type: Date, default: null },

    // Overall Progress Status:
    // - PENDING: Student has not submitted both videos yet.
    // - REVIEW_PENDING: Both videos submitted; waiting for mentor review.
    // - COMPLETED: Mentor has submitted feedback.
    status: {
      type: String,
      enum: ["PENDING", "REVIEW_PENDING", "COMPLETED"],
      default: "PENDING",
    },

    // Evaluator / Mentor Feedback
    feedback: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Unique compound index: one portfolio submission per user per batch slot
softSkillsSubmissionSchema.index({ userId: 1, slotId: 1 }, { unique: true });

if (process.env.NODE_ENV !== "production") {
  delete (mongoose.models as Record<string, unknown>).SoftSkillsSubmission;
}

export const SoftSkillsSubmission =
  mongoose.models.SoftSkillsSubmission ||
  mongoose.model("SoftSkillsSubmission", softSkillsSubmissionSchema);
