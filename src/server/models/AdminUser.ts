import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

// Merges the main backend's AdminUser (permissions array, phone) with
// psych_battery's slimmer adminusers schema — same `adminusers` collection.
const adminUserSchema = new Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "admin" }, // owner | admin | franchise
    permissions: { type: [String], default: [] },
    phone: { type: String },
    // Sales module (see salesimplementation.md Phase 1): "executive"s report to a
    // "head" via reportsTo; both remain role: "admin" with permissions: ["sales"].
    salesRole: { type: String, enum: ["executive", "head", null], default: null },
    reportsTo: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { collection: "adminusers", timestamps: true }
);

adminUserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

adminUserSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    delete ret.password;
    return ret;
  },
});

export const AdminUser = mongoose.models.AdminUser || mongoose.model("AdminUser", adminUserSchema);
