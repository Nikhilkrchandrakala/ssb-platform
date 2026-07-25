"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import CustomButton from "@/components/site/CustomButton";
import { postJSON, ApiError } from "@/lib/authApi";
import "@/style/Login.css"; // for .otp-btn
import "@/style/custom-theme.css";

/**
 * /auth/phone-verify
 * Shown to NEW OAuth users who don't have a verified phone number yet.
 * Collects phone, sends an MSG91 OTP via our backend, verifies it, and
 * attaches the phone to the pending user.
 *
 * `POST /api/oauth/attach-phone` (src/app/api/oauth/attach-phone/route.ts)
 * verifies the short-lived `tempToken` (issued by the OAuth callback),
 * verifies the OTP, updates the User, and — like /api/login — calls
 * `setSessionCookie` itself before returning `{ success, message, user }`.
 * There is no JWT in the response to store; the browser only ever sees the
 * httpOnly cookie the server already set.
 */
function OAuthPhoneVerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const otpRef = useRef<HTMLInputElement>(null);

  const tempToken = searchParams.get("temp");
  const userName = searchParams.get("name") || "there";

  // Form state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [reqId, setReqId] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneTimer, setPhoneTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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
      await postJSON("/api/oauth/attach-phone", { tempToken, phone, otp, reqId });

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

            {/* Cancel */}
            <div className="col-12 text-center mt-3">
              <div className="thm-account-link" onClick={() => router.push("/SignIn")} style={{ cursor: "pointer" }}>
                ← Cancel and go back to Sign In
              </div>
            </div>
          </div>
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
