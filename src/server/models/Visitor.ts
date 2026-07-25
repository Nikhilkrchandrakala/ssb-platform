import mongoose, { Schema } from "mongoose";

const visitorSchema = new Schema({
  count: { type: Number, default: 0 },
});

export const Visitor = mongoose.models.Visitor || mongoose.model("Visitor", visitorSchema);
