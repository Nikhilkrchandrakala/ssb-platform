import mongoose, { Schema } from "mongoose";

const candidateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    entry: { type: String, required: true },
    board: { type: String, required: true },
    status: { type: String, default: "" },
    img: { type: String, required: true },
  },
  { timestamps: true }
);

export const Candidate =
  mongoose.models.Candidate || mongoose.model("Candidate", candidateSchema, "Rec_candidates");
