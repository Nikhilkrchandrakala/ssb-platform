// OTP/verification-token store, backed by MongoDB (VerificationSession
// model) instead of an in-process Map. A plain globalThis Map only works
// when one long-running Node process handles both the "send OTP" and the
// later "verify OTP" request — on Vercel, API routes are serverless
// functions and those two requests can land on different instances, each
// with its own empty globalThis, so the reqId/token written by the first
// request is invisible to the second ("OTP session not found" even though
// the OTP itself was valid). Persisting to Mongo fixes that; the model's
// TTL index handles expiry cleanup.
import { connectDB } from "./db";
import { VerificationSession } from "./models/VerificationSession";

export type TokenEntry = { token: string; expiresAt: number };

const OTP_REQID_TTL_MS = 10 * 60 * 1000; // MSG91 OTP validity window

function createReqIdStore(namespace: string) {
  return {
    async get(email: string): Promise<string | undefined> {
      await connectDB();
      const doc = await VerificationSession.findOne({ key: `${namespace}:${email}` });
      if (!doc || doc.expiresAt.getTime() < Date.now()) return undefined;
      return doc.value;
    },
    async set(email: string, reqId: string): Promise<void> {
      await connectDB();
      const expiresAt = new Date(Date.now() + OTP_REQID_TTL_MS);
      await VerificationSession.updateOne(
        { key: `${namespace}:${email}` },
        { $set: { value: reqId, expiresAt } },
        { upsert: true }
      );
    },
    async delete(email: string): Promise<void> {
      await connectDB();
      await VerificationSession.deleteOne({ key: `${namespace}:${email}` });
    },
  };
}

// key formats already used by callers: `email:<email>` | `phone:<last10>` |
// `student-reset:email:<email>` | `student-reset:phone:<last10>`
const verificationTokenStore = {
  async get(key: string): Promise<TokenEntry | undefined> {
    await connectDB();
    const doc = await VerificationSession.findOne({ key });
    if (!doc) return undefined;
    return { token: doc.value, expiresAt: doc.expiresAt.getTime() };
  },
  async set(key: string, entry: TokenEntry): Promise<void> {
    await connectDB();
    await VerificationSession.updateOne(
      { key },
      { $set: { value: entry.token, expiresAt: new Date(entry.expiresAt) } },
      { upsert: true }
    );
  },
  async delete(key: string): Promise<void> {
    await connectDB();
    await VerificationSession.deleteOne({ key });
  },
};

export const verificationTokens = verificationTokenStore;
export const signupEmailReqIds = createReqIdStore("signup-email-otp");
export const recoveryEmailReqIds = createReqIdStore("recovery-email-otp");
export const studentRecoveryEmailReqIds = createReqIdStore("student-recovery-email-otp");
