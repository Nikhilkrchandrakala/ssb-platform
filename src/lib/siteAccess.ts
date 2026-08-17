export interface SiteAccessUser {
  role?: string;
  rawRole?: string;
  hasPassword?: boolean;
}

/**
 * True once a visitor has an actual account — either they finished the full
 * /SignUp flow (or later set/reset a password), or their originally-lead
 * session has since gained a password via first payment (verifyPayment's
 * deferred-credential flow — see requireSiteUser() in src/server/auth.ts).
 *
 * False for a bare /api/quickJoin lead session, which is minted from an
 * unverified email+phone with no proof of ownership (see that route's own
 * doc comment) so checkout can start immediately. That session must not be
 * enough on its own to unlock content that's meant to require a real
 * signup or purchase, e.g. the Magazine PDFs.
 */
export function isSignedUpSiteUser(user: SiteAccessUser | null | undefined): boolean {
  if (!user) return false;
  if (user.rawRole === "lead") return !!user.hasPassword;
  return true;
}
