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
 * Tries AdminUser -> Franchise -> assessor User -> any other User, so the
 * same email/password works no matter which login page someone lands on —
 * previously /api/login flatly rejected admin/assessor/owner accounts,
 * which is what sent staff bouncing between the two login pages.
 */
export async function resolveLoginCredentials({
  email,
  phone,
  password,
}: {
  email?: string;
  phone?: string;
  password: string;
}): Promise<LoginLookupResult> {
  await connectDB();

  const phoneLast10 = phone ? last10(phone) : null;
  const emailClean = email ? escapeRegExp(email.trim()) : null;

  let user: Candidate | null = null;
  let role = "";

  // 1. Admin/owner check
  if (phone) {
    user = await AdminUser.findOne({ phone: { $regex: new RegExp(`${phoneLast10}$`) } });
  } else if (email) {
    user = await AdminUser.findOne({ email: { $regex: new RegExp(`^${emailClean}$`, "i") } });
  }
  if (user) {
    role = user.role === "owner" ? "owner" : "admin";
  } else {
    // 2. Franchise check
    if (phone) {
      user = await Franchise.findOne({ phone: { $regex: new RegExp(`${phoneLast10}$`) } });
    } else if (email) {
      user = await Franchise.findOne({ email: { $regex: new RegExp(`^${emailClean}$`, "i") } });
    }
    if (user) role = "franchise";
  }

  // 3. Assessor check (in main User collection)
  if (!user) {
    let assessorUser: Candidate | null = null;
    if (phone) {
      assessorUser = await User.findOne({ phone: { $regex: new RegExp(`${phoneLast10}$`) }, role: "assessor" });
    } else if (email) {
      assessorUser = await User.findOne({ email: { $regex: new RegExp(`^${emailClean}$`, "i") }, role: "assessor" });
    }
    if (assessorUser) {
      user = assessorUser;
      role = "assessor";
    }
  }

  // 4. Everyone else (student/lead) in the User collection
  if (!user) {
    if (phone) {
      user = await User.findOne({ phone: { $regex: new RegExp(`${phoneLast10}$`) } });
    } else if (email) {
      user = await User.findOne({ email: { $regex: new RegExp(`^${emailClean}$`, "i") } });
    }
    if (user) role = user.role || "student";
  }

  if (!user) return { status: "not_found" };

  const isMatch = await bcrypt.compare(password, user.password || "");
  if (!isMatch) return { status: "invalid_password" };

  return { status: "ok", user, role };
}
