import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import { AdminUser } from "./models/AdminUser";
import { Franchise } from "./models/Franchise";
import { User } from "./models/User";
import { last10 } from "./integrations/msg91";

type Candidate = {
  _id: unknown;
  password?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  assessorType?: string | null;
  permissions?: string[];
};

export type LoginLookupResult =
  | { status: "not_found" }
  | { status: "invalid_password" }
  | { status: "ok"; user: Candidate; role: string };

const STAFF_ROLES = ["admin", "owner", "assessor", "franchise"];

// Ported from the pre-migration lookups verbatim, which built `new RegExp()`
// straight from the request body — unescaped, that lets `.`/`*`/etc. in an
// "email" match unintended strings, and a pathological pattern (e.g. nested
// quantifiers) is a ReDoS vector since the whole match is fully
// attacker-controlled. Escaping here fixes both without changing behavior
// for any real email address.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Single shared credential lookup used by every login entry point (admin
 * portal, public site, candidate evaluation's session-expired redirect).
 *
 * `portal` scopes which collections are searched:
 * - "admin": AdminUser -> Franchise -> staff-flagged User docs (assessor/
 *   admin/owner/franchise stored in the shared User collection). Never
 *   touches plain student/lead User docs.
 * - "student": only User docs that are NOT staff-flagged.
 * - omitted: legacy behavior — cascades through all of the above in order,
 *   stopping at the first email/phone match. Kept only for callers that
 *   predate the portal split; new callers should always pass `portal`,
 *   since without it a candidate who signed up with the same email as a
 *   staff account can never reach their own User doc (the staff lookup
 *   matches first and any password check against it fails).
 */
export async function resolveLoginCredentials({
  email,
  phone,
  password,
  portal,
}: {
  email?: string;
  phone?: string;
  password: string;
  portal?: "admin" | "student";
}): Promise<LoginLookupResult> {
  await connectDB();

  const phoneLast10 = phone ? last10(phone) : null;
  const emailClean = email ? escapeRegExp(email.trim()) : null;
  const emailOrPhoneQuery = (extra?: Record<string, unknown>) => {
    const base = phone
      ? { phone: { $regex: new RegExp(`${phoneLast10}$`) } }
      : { email: { $regex: new RegExp(`^${emailClean}$`, "i") } };
    return extra ? { ...base, ...extra } : base;
  };

  let user: Candidate | null = null;
  let role = "";

  if (portal !== "student") {
    // 1. Admin/owner check
    user = await AdminUser.findOne(emailOrPhoneQuery());
    if (user) {
      role = user.role === "owner" ? "owner" : "admin";
    } else {
      // 2. Franchise check
      user = await Franchise.findOne(emailOrPhoneQuery());
      if (user) role = "franchise";
    }

    // 3. Staff accounts stored in the shared User collection (assessor, or
    // legacy admin/owner/franchise rows that never got migrated out)
    if (!user) {
      const staffUser = await User.findOne(emailOrPhoneQuery({ role: { $in: STAFF_ROLES } }));
      if (staffUser) {
        user = staffUser;
        role = staffUser.role || "assessor";
      }
    }
  }

  // 4. Student/lead accounts — only reached on the student portal, or on
  // the legacy no-portal path when no staff account matched
  if (!user && portal !== "admin") {
    const studentUser = await User.findOne(emailOrPhoneQuery({ role: { $nin: STAFF_ROLES } }));
    if (studentUser) {
      user = studentUser;
      role = studentUser.role || "student";
    }
  }

  if (!user) return { status: "not_found" };

  const isMatch = await bcrypt.compare(password, user.password || "");
  if (!isMatch) return { status: "invalid_password" };

  return { status: "ok", user, role };
}
