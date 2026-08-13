import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/server/db";
import { User } from "@/server/models/User";
import { signSessionToken, setSessionCookie } from "@/server/auth";
import { isDevOtpBypass, verifyOtp, last10 } from "@/server/integrations/msg91";
import { submitSignupLead } from "@/server/integrations/zoho";

const JWT_SECRET = (process.env.JWT_SECRET || "").trim();

export async function POST(req: NextRequest) {
  const {
    tempToken,
    phone,
    otp,
    reqId,
    // SSB Profile fields — normal (non-OAuth) signup collects these in its
    // own "Step 4" and they get submitted to Zoho's Magazine Download
    // webform via submitSignupLead() below. OAuth signup has no equivalent
    // step of its own, so without capturing them here every Google/
    // Facebook/LinkedIn signup reached Zoho as a lead with every profiling
    // field blank — useless for the client's CRM tracking/investigation
    // workflow. The phone-verify page now collects these in a "Step 1"
    // before the phone/OTP step and sends them along with this same request.
    dob,
    ssbAspirant,
    servingCandidate,
    vtxHeard,
    youtubeSubscribed,
    podcastSubscribed,
    ssbExperience,
    nextSsbDate,
    ssbBoards,
    ssbEntries,
    city,
    state,
  } = await req.json();

  if (!tempToken || !phone || !otp || !reqId) {
    return NextResponse.json({ success: false, message: "tempToken, phone, otp and reqId are required" }, { status: 400 });
  }

  let decoded: { id: string; needsPhone?: boolean };
  try {
    decoded = jwt.verify(tempToken, JWT_SECRET) as { id: string; needsPhone?: boolean };
  } catch {
    return NextResponse.json({ success: false, message: "Session expired. Please sign in again." }, { status: 401 });
  }

  if (!decoded.needsPhone) {
    return NextResponse.json({ success: false, message: "Invalid token type." }, { status: 400 });
  }

  const userId = decoded.id;
  const phoneLast10 = last10(phone);

  let verified = false;
  if (isDevOtpBypass(otp)) {
    verified = true;
  } else {
    try {
      verified = await verifyOtp({ otp, reqId, widget: "phone" });
    } catch (err) {
      console.error("[oauth/attach-phone] MSG91 verify error:", err instanceof Error ? err.message : err);
      return NextResponse.json({ success: false, message: "OTP verification failed. Please try again." }, { status: 500 });
    }
  }

  if (!verified) {
    return NextResponse.json({ success: false, message: "Invalid OTP. Please try again." }, { status: 400 });
  }

  await connectDB();

  const existingPhoneUser = await User.findOne({
    phone: { $regex: new RegExp(`${phoneLast10}$`) },
    _id: { $ne: userId },
  });
  if (existingPhoneUser) {
    return NextResponse.json({ success: false, message: "This phone number is already linked to another account." }, { status: 400 });
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      phone: phoneLast10,
      phoneVerified: true,
      zohoFormFilled: true,
      dob: dob || "",
      ssbAspirant: ssbAspirant || "",
      servingCandidate: servingCandidate || "",
      vtxHeard: vtxHeard || "",
      youtubeSubscribed: youtubeSubscribed || "",
      podcastSubscribed: podcastSubscribed || "",
      ssbExperience: ssbExperience || "",
      nextSsbDate: nextSsbDate || "",
      ssbBoards: Array.isArray(ssbBoards) ? ssbBoards : [],
      ssbEntries: Array.isArray(ssbEntries) ? ssbEntries : [],
      city: city || "",
      state: state || "",
    },
    { new: true }
  );
  if (!user) {
    return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
  }

  submitSignupLead(user).catch((err) => {
    console.error("[oauth/attach-phone] background Zoho submission failed:", err);
  });

  const token = signSessionToken({ id: user._id.toString(), role: user.role || "lead" });
  await setSessionCookie(token);

  return NextResponse.json({
    success: true,
    message: "Phone verified and account setup complete!",
    user: { name: user.name, email: user.email, phone: user.phone },
  });
}
