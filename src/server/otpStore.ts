// In-memory OTP/verification-token stores, ported as-is from the legacy
// Express modules (emailOtp.js, signupOtp.js, forgotPassword.js all kept
// module-level `Map`s). Cached on `globalThis` — same reasoning as
// `db.ts`'s mongoose cache — so Next.js dev hot-reload and repeated route
// invocations in one long-running process share the same maps instead of
// each module reload wiping pending OTPs.
type TokenEntry = { token: string; expiresAt: number };

interface OtpStore {
  verificationTokens: Map<string, TokenEntry>; // key: `email:<email>` | `phone:<last10>` | `student-reset:email:<email>` | `student-reset:phone:<last10>`
  signupEmailReqIds: Map<string, string>; // key: email -> MSG91 reqId
  recoveryEmailReqIds: Map<string, string>; // key: email -> MSG91 reqId (admin/franchise/assessor password recovery)
  studentRecoveryEmailReqIds: Map<string, string>; // key: email -> MSG91 reqId (student self-service password recovery)
  cleanupTimer: NodeJS.Timeout | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _otpStore: OtpStore | undefined;
}

const store: OtpStore = global._otpStore ?? {
  verificationTokens: new Map(),
  signupEmailReqIds: new Map(),
  recoveryEmailReqIds: new Map(),
  studentRecoveryEmailReqIds: new Map(),
  cleanupTimer: null,
};
global._otpStore = store;

if (!store.cleanupTimer) {
  store.cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of store.verificationTokens) {
      if (val.expiresAt < now) store.verificationTokens.delete(key);
    }
  }, 10 * 60 * 1000);
  store.cleanupTimer.unref?.();
}

export const verificationTokens = store.verificationTokens;
export const signupEmailReqIds = store.signupEmailReqIds;
export const recoveryEmailReqIds = store.recoveryEmailReqIds;
export const studentRecoveryEmailReqIds = store.studentRecoveryEmailReqIds;
