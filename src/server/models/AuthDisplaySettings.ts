import mongoose, { Schema } from "mongoose";

const authDisplaySettingsSchema = new Schema(
  {
    mode: { type: String, enum: ["slideshow", "ad"], default: "slideshow" },
    slideshowImages: { type: [String], default: [] },
    adImage: { type: String, default: "" },
    adLink: { type: String, default: "" },
    transitionValue: { type: Number, default: 5 },
    transitionUnit: { type: String, enum: ["seconds", "minutes", "hours", "days"], default: "seconds" },
  },
  { timestamps: true }
);

export const AuthDisplaySettings =
  mongoose.models.AuthDisplaySettings || mongoose.model("AuthDisplaySettings", authDisplaySettingsSchema);
