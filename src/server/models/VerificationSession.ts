import mongoose, { Schema } from "mongoose";

// Cross-instance replacement for the old globalThis-Map OTP/token store
// (see otpStore.ts). The site runs on Vercel, where API routes are
// serverless functions — a "send OTP" request and the later "verify OTP"
// request can land on different function instances, each with its own
// empty globalThis, so anything cached there is invisible to the next
// request. Persisting sessions here instead survives across instances.
// The TTL index auto-deletes documents once expiresAt passes, so callers
// don't need a manual cleanup timer.
const verificationSessionSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

verificationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationSession =
  mongoose.models.VerificationSession || mongoose.model("VerificationSession", verificationSessionSchema);
