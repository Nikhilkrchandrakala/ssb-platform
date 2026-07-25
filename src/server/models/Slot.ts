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
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Slot = mongoose.models.Slot || mongoose.model("Slot", slotSchema);
