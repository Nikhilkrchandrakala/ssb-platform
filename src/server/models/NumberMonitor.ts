import mongoose, { Schema } from "mongoose";

const numberMonitorSchema = new Schema({
  officerSelection: { type: Number, required: true },
  yearService: { type: Number, required: true },
  facultyExperience: { type: Number, required: true },
  totalFaculty: { type: Number, required: true },
});

export const NumberMonitor =
  mongoose.models.numberMonitor || mongoose.model("numberMonitor", numberMonitorSchema);
