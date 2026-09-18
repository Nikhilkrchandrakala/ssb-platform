"use client";

import { useRef, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { postJSON, ApiError } from "@/lib/authApi";
import TurnstileWidget from "@/components/TurnstileWidget";

/**
 * Inline offline-batch guest checkout panel — the offline equivalent of
 * QuickJoinPanel.tsx, but OTP-gated (email + phone) instead of just a
 * Turnstile challenge, since offline registration needs a verified way to
 * reach the student before they show up in person. Reuses the exact same
 * OTP infrastructure the full /SignUp wizard uses
 * (/api/signup/send-email-otp, verify-email-otp, send-phone-otp,
 * verify-phone-otp), condensed into 3 steps with no password and no SSB
 * profile questions, then hands the two verify tokens to /api/offlineJoin.
 *
 * Same contract as QuickJoinPanel: calls onAuthenticated() once a session is
 * established, so the parent can proceed straight to payment.
 */

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  marginBottom: 10,
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  borderRadius: 6,
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
  background: "linear-gradient(0deg, #C5A028 0%, #E0C214 100%)",
  color: "#0b0b0b",
};

const linkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#c6c5af",
  fontSize: 13,
  marginTop: 12,
  cursor: "pointer",
  textDecoration: "underline",
};

const backRowStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "none",
  border: "none",
  color: "#c6c5af",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 14,
  cursor: "pointer",
  padding: 0,
};

function BackRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={backRowStyle}>
      <FaArrowLeft size={12} /> {label}
    </button>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

type Step = "info" | "emailOtp" | "phoneOtp" | "login";

// See the matching comment on the Turnstile requirement below.
const isProduction = process.env.NODE_ENV !== "development";

export default function OfflineJoinPanel({ onAuthenticated, onBack }: { onAuthenticated: () => void; onBack?: () => void }) {
  const [step, setStep] = useState<Step>("info");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneReqId, setPhoneReqId] = useState("");
  const [emailVerifyToken, setEmailVerifyToken] = useState("");
  const [emailTimer, setEmailTimer] = useState(0);
  const [phoneTimer, setPhoneTimer] = useState(0);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const otpInputRef = useRef<HTMLInputElement>(null);

  const emailTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phoneTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startEmailTimer = () => {
    setEmailTimer(300);
    if (emailTimerRef.current) clearInterval(emailTimerRef.current);
    emailTimerRef.current = setInterval(() => {
      setEmailTimer((prev) => {
        if (prev <= 1 && emailTimerRef.current) clearInterval(emailTimerRef.current);
        return prev - 1;
      });
    }, 1000);
  };

  const startPhoneTimer = () => {
    setPhoneTimer(30);
    if (phoneTimerRef.current) clearInterval(phoneTimerRef.current);
    phoneTimerRef.current = setInterval(() => {
      setPhoneTimer((prev) => {
        if (prev <= 1 && phoneTimerRef.current) clearInterval(phoneTimerRef.current);
        return prev - 1;
      });
    }, 1000);
  };

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isValidPhone = (p: string) => /^[0-9]{10}$/.test(p);

  const handleSendEmailOtp = async () => {
    setError("");
    try {
      await postJSON("/api/signup/send-email-otp", { email, turnstileToken });
      startEmailTimer();
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (err) {
      setError(err instanceof ApiError ? (err.data?.message as string) || err.message : "Failed to send email OTP");
      throw err;
    }
  };

  const handleContinueFromInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Name is required");
    if (!isValidEmail(email)) return setError("Please enter a valid email address");
    if (!isValidPhone(phone)) return setError("Please enter a valid 10-digit phone number");
    // The Turnstile site key is domain-restricted to the production
    // domain in Cloudflare's dashboard, so the widget can't be exercised
    // locally — see turnstile.ts's matching dev bypass. Hidden below in the
    // same way, and both re-enable automatically in a production build.
    if (isProduction && !turnstileToken) return setError("Please complete the verification challenge");

    setError("");
    setIsSubmitting(true);
    try {
      const result = await postJSON<{ exists: boolean; message?: string }>("/api/check-user-exists", { email, phone });
      if (result.exists) {
        setError(result.message || "An account with this email or phone already exists.");
        return;
      }
      await handleSendEmailOtp();
      setStep("emailOtp");
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailOtp.length < 4 || emailOtp.length > 6) return setError("Please enter a valid OTP");
    setError("");
    setIsSubmitting(true);
    try {
      const result = await postJSON<{ success: boolean; message?: string; emailVerifyToken?: string }>(
        "/api/signup/verify-email-otp",
        { email, otp: emailOtp }
      );
      if (!result.success) {
        setError(result.message || "Invalid OTP");
        return;
      }
      setEmailVerifyToken(result.emailVerifyToken || "");
      const phoneResult = await postJSON<{ success: boolean; reqId?: string }>("/api/signup/send-phone-otp", { phone });
      if (!phoneResult.success) {
        setError("Failed to send phone OTP");
        return;
      }
      setPhoneReqId(phoneResult.reqId || "");
      startPhoneTimer();
      setStep("phoneOtp");
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (err) {
      setError(err instanceof ApiError ? (err.data?.message as string) || err.message : "Verification failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyPhoneAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneOtp.length < 4 || phoneOtp.length > 6) return setError("Please enter a valid OTP");
    setError("");
    setIsSubmitting(true);
    try {
      const verifyResult = await postJSON<{ success: boolean; message?: string; phoneVerifyToken?: string }>(
        "/api/signup/verify-phone-otp",
        { phone, otp: phoneOtp, reqId: phoneReqId }
      );
      if (!verifyResult.success) {
        setError(verifyResult.message || "Invalid OTP");
        return;
      }
      await postJSON("/api/offlineJoin", {
        name,
        email,
        phone,
        emailVerifyToken,
        phoneVerifyToken: verifyResult.phoneVerifyToken,
      });
      onAuthenticated();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setLoginEmail(email);
        setNotice(err.message);
        setStep("login");
      } else {
        setError(err instanceof ApiError ? (err.data?.message as string) || err.message : "Something went wrong");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setError("Email and password are required");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await postJSON("/api/login", { email: loginEmail.trim(), password: loginPassword, portal: "student" });
      onAuthenticated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "login") {
    return (
      <div style={{ padding: "10px 0" }}>
        <BackRow label="New here? Register instead" onClick={() => setStep("info")} />
        <h4 style={{ color: "#f4c430", marginBottom: 12 }}>Log In</h4>
        {notice && <p style={{ color: "#f4c430", fontSize: 13, marginBottom: 12 }}>{notice}</p>}
        <form onSubmit={handleLoginSubmit}>
          <input type="email" placeholder="Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required style={inputStyle} />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
            style={inputStyle}
          />
          {error && <p style={{ color: "#e0806a", fontSize: 13, marginBottom: 10 }}>{error}</p>}
          <button type="submit" disabled={isSubmitting} style={buttonStyle}>
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>
        </form>
      </div>
    );
  }

  if (step === "emailOtp") {
    return (
      <div style={{ padding: "10px 0" }}>
        <BackRow label="Back to edit info" onClick={() => setStep("info")} />
        <h4 style={{ color: "#f4c430", marginBottom: 4 }}>Verify your email</h4>
        <p style={{ color: "#c6c5af", fontSize: 13, marginBottom: 12 }}>
          We&apos;ve sent a code to <strong style={{ color: "#f4c430" }}>{email}</strong>
        </p>
        <form onSubmit={handleVerifyEmailOtp}>
          <input
            ref={otpInputRef}
            type="text"
            placeholder="Enter OTP"
            value={emailOtp}
            maxLength={6}
            inputMode="numeric"
            onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            style={inputStyle}
          />
          <div style={{ textAlign: "right", marginBottom: 10 }}>
            {emailTimer > 0 ? (
              <span style={{ color: "#c6c5af", fontSize: 12 }}>Resend in {formatTime(emailTimer)}</span>
            ) : (
              <span style={{ color: "#f4c430", fontSize: 12, cursor: "pointer" }} onClick={() => handleSendEmailOtp()}>
                Resend OTP
              </span>
            )}
          </div>
          {error && <p style={{ color: "#e0806a", fontSize: 13, marginBottom: 10 }}>{error}</p>}
          <button type="submit" disabled={isSubmitting || emailOtp.length < 4} style={buttonStyle}>
            {isSubmitting ? "Verifying..." : "Verify Email"}
          </button>
        </form>
      </div>
    );
  }

  if (step === "phoneOtp") {
    return (
      <div style={{ padding: "10px 0" }}>
        <BackRow label="Back to email verification" onClick={() => setStep("emailOtp")} />
        <h4 style={{ color: "#f4c430", marginBottom: 4 }}>Verify your phone</h4>
        <p style={{ color: "#c6c5af", fontSize: 13, marginBottom: 12 }}>
          We&apos;ve sent a code to <strong style={{ color: "#f4c430" }}>+91 {phone}</strong>
        </p>
        <form onSubmit={handleVerifyPhoneAndJoin}>
          <input
            ref={otpInputRef}
            type="text"
            placeholder="Enter OTP"
            value={phoneOtp}
            maxLength={6}
            inputMode="numeric"
            onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            style={inputStyle}
          />
          <div style={{ textAlign: "right", marginBottom: 10 }}>
            {phoneTimer > 0 ? (
              <span style={{ color: "#c6c5af", fontSize: 12 }}>Resend in {formatTime(phoneTimer)}</span>
            ) : (
              <span
                style={{ color: "#f4c430", fontSize: 12, cursor: "pointer" }}
                onClick={async () => {
                  const r = await postJSON<{ success: boolean; reqId?: string }>("/api/signup/send-phone-otp", { phone });
                  setPhoneReqId(r.reqId || "");
                  startPhoneTimer();
                }}
              >
                Resend OTP
              </span>
            )}
          </div>
          {error && <p style={{ color: "#e0806a", fontSize: 13, marginBottom: 10 }}>{error}</p>}
          <button type="submit" disabled={isSubmitting || phoneOtp.length < 4} style={buttonStyle}>
            {isSubmitting ? "Verifying..." : "Verify & Continue to Payment"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: "10px 0" }}>
      {onBack && <BackRow label="Back" onClick={onBack} />}
      <h4 style={{ color: "#f4c430", marginBottom: 4 }}>Register for this offline batch</h4>
      <p style={{ color: "#c6c5af", fontSize: 13, marginBottom: 12 }}>
        We verify your email and phone before payment, since this is an in-person batch.
      </p>
      {error && <p style={{ color: "#e0806a", fontSize: 13, marginBottom: 10 }}>{error}</p>}
      <form onSubmit={handleContinueFromInfo}>
        <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        <input
          type="tel"
          placeholder="10-digit phone number"
          value={phone}
          maxLength={10}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          required
          style={inputStyle}
        />
        {isProduction && <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />}
        <button type="submit" disabled={isSubmitting} style={buttonStyle}>
          {isSubmitting ? "Please wait..." : "Continue"}
        </button>
      </form>
      <button type="button" onClick={() => setStep("login")} style={linkStyle}>
        Already have an account? Log in
      </button>
    </div>
  );
}
