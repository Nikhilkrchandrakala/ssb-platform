"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import CustomButton from "@/components/site/CustomButton";
import { postJSON, ApiError } from "@/lib/authApi";
import "@/style/Login.css"; // for .otp-btn
import "@/style/custom-theme.css";
import "@/style/MagazineGateForm.css"; // for the .mgf-* SSB Profile step

// Same lists SignUp's Step 4 uses — kept in sync manually since that page
// duplicates rather than shares this data; mirrored here so OAuth signups
// see the identical SSB Profile questionnaire non-OAuth signups fill in.
const BOARD_OPTIONS = [
  "1 AFSB", "2 AFSB", "3 AFSB", "4 AFSB", "5 AFSB",
  "33 SSB Bhopal (Navy)", "NSB Vizag (Navy)", "12 SSB Bangalore (Navy)",
  "SSB (Kolkata) (Navy)", "31 | 32 SSB Selection Center North (Kapurthala)",
  "11 | 14 | 18 | 19 | 34 SSB Selection Center East Prayagraj",
  "20 | 21 | 22 SSB Bhopal", "17 | 24 SSB Bangalore",
  "Not allotted yet", "Not known right now", "CGSB (NOIDA)", "NOT IN THIS LIST",
];

const ENTRY_OPTIONS = [
  "10+2 B. Tech. entry (Navy)", "10+2 TES", "AFCAT",
  "Army Service entry (PCSL, SCO, ACC, AMC)", "CDS",
  "Navy Service entry (CW, SD List)", "NCC special entry", "NDA",
  "SSC (JAG)", "SSC (Tech) Army",
  "SSC Navy (Executive, Law, Pilot, Naval Air Operations, Engineering, Electrical, Logistics, Naval Armament, Education)",
  "Territorial Army", "TGC",
];

/**
 * /auth/phone-verify
 * Shown to NEW OAuth users who don't have a verified phone number yet.
 *
 * Two local steps:
 *  1. SSB Profile — the same questionnaire non-OAuth signup collects in its
 *     own "Step 4" (dob, aspirant/serving status, boards, entries, etc.).
 *     OAuth signup skipped straight from the provider's consent screen to
 *     phone verification, so this data — which feeds Zoho CRM's Magazine
 *     Download webform for lead tracking/investigation — was never asked
 *     for and every OAuth lead reached Zoho blank. This step closes that
 *     gap; it's client-side only, no API call.
 *  2. Phone + OTP (unchanged) — sends the MSG91 OTP, then verifies it.
 *
 * `POST /api/oauth/attach-phone` (src/app/api/oauth/attach-phone/route.ts)
 * verifies the short-lived `tempToken` (issued by the OAuth callback),
 * verifies the OTP, saves the phone *and* the Step 1 profile fields onto
 * the User, submits the now-complete profile to Zoho, and — like
 * /api/login — calls `setSessionCookie` itself before returning
 * `{ success, message, user }`. There is no JWT in the response to store;
 * the browser only ever sees the httpOnly cookie the server already set.
 */
function OAuthPhoneVerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const otpRef = useRef<HTMLInputElement>(null);

  const tempToken = searchParams.get("temp");
  const userName = searchParams.get("name") || "there";

  // step 1 = SSB Profile, step 2 = phone + OTP
  const [step, setStep] = useState(1);

  // Form state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [reqId, setReqId] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneTimer, setPhoneTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // SSB Profile fields — same set/defaults as SignUp's Step 4.
  const [dob, setDob] = useState("");
  const [ssbAspirant, setSsbAspirant] = useState("-None-");
  const [servingCandidate, setServingCandidate] = useState("-None-");
  const [vtxHeard, setVtxHeard] = useState("-None-");
  const [youtubeSubscribed, setYoutubeSubscribed] = useState("-None-");
  const [podcastSubscribed, setPodcastSubscribed] = useState("-None-");
  const [ssbExperience, setSsbExperience] = useState("-None-");
  const [nextSsbDate, setNextSsbDate] = useState("");
  const [ssbBoards, setSsbBoards] = useState<string[]>([]);
  const [ssbEntries, setSsbEntries] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const handleProfileNext = () => {
    if (ssbAspirant === "-None-") {
      setErrorMsg("Please select if you are an SSB Aspirant.");
      return;
    }
    if (servingCandidate === "-None-") {
      setErrorMsg("Please select if you are a serving candidate.");
      return;
    }
    setErrorMsg("");
    setStep(2);
  };

  // Redirect if no temp token (direct navigation to this page without OAuth)
  useEffect(() => {
    if (!tempToken) {
      toast.error("Session not found. Please sign in again.");
      router.replace("/SignIn");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempToken]);

  // Countdown timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (phoneTimer > 0) {
      interval = setInterval(() => setPhoneTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [phoneTimer]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // ─── Send OTP via existing backend endpoint ───
  const handleSendOtp = async () => {
    if (!phone || phone.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit phone number.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await postJSON<{ success: boolean; reqId?: string }>("/api/signup/send-phone-otp", { phone });
      if (res.success) {
        setReqId(res.reqId || "");
        setOtpSent(true);
        setPhoneTimer(30);
        setSuccessMsg(`OTP sent to +91 ${phone}`);
        setTimeout(() => otpRef.current?.focus(), 100);
      } else {
        setErrorMsg("Failed to send OTP. Please try again.");
      }
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setErrorMsg((apiErr?.data?.message as string) || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Verify OTP and attach phone ───
  const handleVerify = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!otp || otp.length < 4) {
      setErrorMsg("Please enter the OTP.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      await postJSON("/api/oauth/attach-phone", {
        tempToken,
        phone,
        otp,
        reqId,
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
      });

      // No token to store — /api/oauth/attach-phone already set the session
      // cookie server-side, same as /api/login.
      toast.success("Account setup complete! Welcome aboard 🎉");
      router.push("/ProfileDashboard");
      router.refresh();
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const msg = (apiErr?.data?.message as string) || "Verification failed. Please try again.";
      if (msg.includes("expired")) {
        toast.error("Session expired. Please sign in again.");
        router.replace("/SignIn");
        return;
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="thm-content-layer">
      <div className="thm-content-bg"></div>
      <div className="container position-relative">
        <h1 className="thm-big-title">One Last Step</h1>

        <div className="position-relative" style={{ zIndex: "55555" }}>
          {/* STEP 1: SSB PROFILE — same questionnaire non-OAuth SignUp collects,
              feeding Zoho's Magazine Download webform (client's CRM lead tracking). */}
          {step === 1 && (
            <div className="row g-3 justify-content-center mgf-wrapper" style={{ border: "none", background: "transparent", padding: 0 }}>
              <div className="col-lg-12 text-center mb-2">
                <p style={{ color: "#c6c5af", fontSize: "18px", lineHeight: "1.6" }}>
                  Welcome, <strong style={{ color: "#f4c430" }}>{userName}</strong>! Complete your{" "}
                  <strong style={{ color: "#f4c430" }}>SSB Profile</strong> to finish setup.
                </p>
              </div>

              <div className="col-lg-6 mgf-field">
                <label className="mgf-label">Date of Birth</label>
                <input className="mgf-input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>

              <div className="col-lg-6 mgf-field">
                <label className="mgf-label">
                  Are you an SSB Aspirant? <span className="mgf-required">*</span>
                </label>
                <select className="mgf-select" value={ssbAspirant} onChange={(e) => setSsbAspirant(e.target.value)}>
                  <option value="-None-">Select…</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="col-lg-6 mgf-field">
                <label className="mgf-label">
                  Serving candidate? <span className="mgf-required">*</span>
                </label>
                <select className="mgf-select" value={servingCandidate} onChange={(e) => setServingCandidate(e.target.value)}>
                  <option value="-None-">Select…</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="col-lg-6 mgf-field">
                <label className="mgf-label">SSB Experience</label>
                <select className="mgf-select" value={ssbExperience} onChange={(e) => setSsbExperience(e.target.value)}>
                  <option value="-None-">Select…</option>
                  <option value="Fresher">Fresher</option>
                  <option value="Screen Out">Screen Out</option>
                  <option value="Conference Out">Conference Out</option>
                </select>
              </div>

              <div className="col-lg-6 mgf-field">
                <label className="mgf-label">Heard about VTX™?</label>
                <select className="mgf-select" value={vtxHeard} onChange={(e) => setVtxHeard(e.target.value)}>
                  <option value="-None-">Select…</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="col-lg-6 mgf-field">
                <label className="mgf-label">Subscribed to YouTube?</label>
                <select className="mgf-select" value={youtubeSubscribed} onChange={(e) => setYoutubeSubscribed(e.target.value)}>
                  <option value="-None-">Select…</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="col-lg-6 mgf-field">
                <label className="mgf-label">Subscribed to Podcast?</label>
                <select className="mgf-select" value={podcastSubscribed} onChange={(e) => setPodcastSubscribed(e.target.value)}>
                  <option value="-None-">Select…</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="col-lg-6 mgf-field">
                <label className="mgf-label">Next SSB Date</label>
                <input className="mgf-input" type="date" value={nextSsbDate} onChange={(e) => setNextSsbDate(e.target.value)} />
              </div>

              <div className="col-lg-6 mgf-field">
                <label className="mgf-label">City</label>
                <input className="mgf-input" placeholder="New Delhi" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>

              <div className="col-lg-6 mgf-field">
                <label className="mgf-label">State</label>
                <input className="mgf-input" placeholder="Delhi" value={state} onChange={(e) => setState(e.target.value)} />
              </div>

              <div className="col-lg-12 mgf-field mt-3">
                <label className="mgf-label">SSB Board / Centre (Select all that apply)</label>
                <div
                  className="mgf-checkbox-grid"
                  style={{ maxHeight: "160px", overflowY: "auto", background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "6px" }}
                >
                  {BOARD_OPTIONS.map((opt) => (
                    <label key={opt} className="mgf-checkbox-item">
                      <input
                        type="checkbox"
                        checked={ssbBoards.includes(opt)}
                        onChange={() => {
                          setSsbBoards((prev) => (prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]));
                        }}
                      />
                      <span style={{ fontSize: "13px", color: "#eae9d4" }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="col-lg-12 mgf-field mt-3">
                <label className="mgf-label">SSB Entry (Select all that apply)</label>
                <div
                  className="mgf-checkbox-grid"
                  style={{ maxHeight: "160px", overflowY: "auto", background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "6px" }}
                >
                  {ENTRY_OPTIONS.map((opt) => (
                    <label key={opt} className="mgf-checkbox-item">
                      <input
                        type="checkbox"
                        checked={ssbEntries.includes(opt)}
                        onChange={() => {
                          setSsbEntries((prev) => (prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]));
                        }}
                      />
                      <span style={{ fontSize: "13px", color: "#eae9d4" }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div className="col-lg-12">
                  <p className="field-error text-center" style={{ fontSize: "16px", margin: 0 }}>
                    {errorMsg}
                  </p>
                </div>
              )}

              <div className="col-12 d-flex justify-content-center mt-4">
                <CustomButton text="NEXT" onClick={handleProfileNext} />
              </div>

              <div className="col-12 text-center mt-3">
                <div className="thm-account-link" onClick={() => router.push("/SignIn")} style={{ cursor: "pointer" }}>
                  ← Cancel and go back to Sign In
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PHONE + OTP (unchanged) */}
          {step === 2 && (
            <div className="row col-xl-7 g-4 g-md-2 col-lg-9 mx-auto justify-content-center">
              {/* Greeting */}
              <div className="col-lg-12 text-center mb-2">
                <p style={{ color: "#c6c5af", fontSize: "18px", lineHeight: "1.7" }}>
                  Almost there, <strong style={{ color: "#f4c430" }}>{userName}</strong>!
                  <br />
                  We need your phone number to complete your account setup.
                </p>
                <p style={{ color: "#8a8978", fontSize: "14px", marginTop: "8px" }}>
                  📱 Your number will be verified via OTP — same as regular signup
                </p>
              </div>

              {/* Phone + OTP button */}
              <div className="col-lg-12">
                <div className="input-group" style={{ gap: "10px", display: "flex" }}>
                  <input
                    type="text"
                    className="form-control thm-input"
                    placeholder="Your 10-digit Phone Number"
                    value={phone}
                    maxLength={10}
                    inputMode="numeric"
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      if (v.length <= 10) setPhone(v);
                    }}
                    disabled={otpSent && phoneTimer > 0}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="otp-btn"
                    onClick={handleSendOtp}
                    disabled={loading || (otpSent && phoneTimer > 0)}
                    style={{ whiteSpace: "nowrap", minWidth: "110px" }}
                    type="button"
                  >
                    {loading && !otp ? "Sending..." : otpSent && phoneTimer > 0 ? formatTime(phoneTimer) : otpSent ? "Resend OTP" : "SEND OTP"}
                  </button>
                </div>
              </div>

              {/* OTP input */}
              {otpSent && (
                <div className="col-lg-12">
                  <input
                    ref={otpRef}
                    type="text"
                    className="form-control thm-input"
                    placeholder="Enter OTP"
                    value={otp}
                    maxLength={6}
                    inputMode="numeric"
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      if (v.length <= 6) setOtp(v);
                    }}
                  />
                </div>
              )}

              {/* Messages */}
              {successMsg && (
                <div className="col-lg-12">
                  <p style={{ color: "#22c55e", textAlign: "center", margin: 0 }}>{successMsg}</p>
                </div>
              )}
              {errorMsg && (
                <div className="col-lg-12">
                  <p className="field-error text-center" style={{ fontSize: "16px" }}>
                    {errorMsg}
                  </p>
                </div>
              )}

              {/* Verify button */}
              {otpSent && (
                <div className="col-12 d-flex justify-content-center mt-4">
                  <CustomButton
                    text={loading ? "Verifying..." : "VERIFY & COMPLETE SETUP"}
                    onClick={handleVerify}
                    disabled={loading || otp.length < 4}
                  />
                </div>
              )}

              {/* Back / Cancel */}
              <div className="col-12 text-center mt-3 d-flex justify-content-center gap-3">
                <div
                  className="thm-account-link"
                  onClick={() => {
                    setStep(1);
                    setErrorMsg("");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  ← Back to SSB Profile
                </div>
                <div className="thm-account-link" onClick={() => router.push("/SignIn")} style={{ cursor: "pointer" }}>
                  Cancel and go back to Sign In
                </div>
              </div>
            </div>
          )}
        </div>

        <span className="thm-glow"></span>
      </div>
    </div>
  );
}

export default function OAuthPhoneVerify() {
  return (
    <Suspense fallback={null}>
      <OAuthPhoneVerifyInner />
    </Suspense>
  );
}
