import mongoose, { Schema } from "mongoose";

const slotSchema = new Schema(
  {
    title: { type: String, required: true },
    batchNo: { type: String },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    maxStudents: { type: Number, default: 50 },
    bookedStudents: [{ type: Schema.Types.ObjectId, ref: "User" }],
    price: { type: Number, required: true },
    isFullCourse: { type: Boolean, default: false },
    // Whether this batch is delivered online or in person. Offline batches
    // have no morning/evening clock-time concept and use `location` instead.
    mode: { type: String, enum: ["online", "offline"], default: "online" },
    location: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Slot = mongoose.models.Slot || mongoose.model("Slot", slotSchema);
