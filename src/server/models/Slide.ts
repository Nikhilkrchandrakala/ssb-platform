import mongoose, { Schema } from "mongoose";

const slideSchema = new Schema(
  {
    assessmentId: { type: Schema.Types.ObjectId, ref: "Assessment", required: true },
    slideType: { type: String, required: true },
    module: {
      type: String,
      enum: ["INTRO", "TAT", "WAT_INST", "WAT", "SRT_INST", "SRT", "SDT_INST", "SDT", "CLOSING"],
      default: "INTRO",
    },
    imageUrl: String,
    content: String,
    displayTime: { type: Number, default: 5 },
    order: { type: Number, default: 0 },
    typographyScale: { type: Number, default: 1 },
    lineHeight: { type: Number, default: 1.6 },
    inverted: { type: Boolean, default: false },
    isInstruction: { type: Boolean, default: false },
  },
  { timestamps: true }
);

slideSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    return ret;
  },
});

export const Slide = mongoose.models.Slide || mongoose.model("Slide", slideSchema);
