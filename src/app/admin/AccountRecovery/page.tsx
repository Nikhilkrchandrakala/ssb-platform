"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { postJSON, ApiError } from "@/lib/authApi";

/**
 * Staff (admin/franchise/assessor) account recovery.
 * Ported from admin-ssbwithisv/AccountRecovery.html + assets/js/recovery.js.
 *
 * Scope note: the legacy page also supported phone-number recovery by
 * calling MSG91's OTP API directly from the browser with a hardcoded
 * tokenAuth/widgetId pair baked into the bundle — the same client-embedded
 * third-party secret pattern the site's (site)/AccountRecovery page already
 * declined to port. Only the email path (which already goes through our own
 * /api/send-otp, /api/verify-otp, /api/forgot-password Route Handlers) is kept.
 */
export default function AdminAccountRecoveryPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = (seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(seconds);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const sendOtp = async () => {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      await window.Swal?.fire({
        icon: "error",
        title: "Dispatch Failed",
        text: "Please enter a valid email address",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
      return;
    }

    window.Swal?.fire({
      title: "Dispatching OTP...",
      text: "Please wait.",
      allowOutsideClick: false,
      background: "#1a1a1a",
      color: "#fff",
      didOpen: () => window.Swal?.showLoading(),
    });

    try {
      await postJSON("/api/send-otp", { email: value.toLowerCase() });
      window.Swal?.fire({
        icon: "success",
        title: "OTP Dispatched",
        text: "A verification OTP has been sent successfully to your email address!",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
      });
      setStep(2);
      startTimer(300);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      window.Swal?.fire({
        icon: "error",
        title: "Dispatch Failed",
        text: apiErr?.message || "Failed to send email OTP",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    }
  };

  const verifyOtpCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) return;

    window.Swal?.fire({
      title: "Verifying Code...",
      text: "Please wait.",
      allowOutsideClick: false,
      background: "#1a1a1a",
      color: "#fff",
      didOpen: () => window.Swal?.showLoading(),
    });

    try {
      await postJSON("/api/verify-otp", { email: email.trim().toLowerCase(), otp: otp.trim() });
      window.Swal?.fire({
        icon: "success",
        title: "OTP Verified",
        text: "Identity verified! Please set your new password.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
      });
      setStep(3);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      window.Swal?.fire({
        icon: "error",
        title: "Verification Failed",
        text: apiErr?.message || "Invalid OTP code",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      window.Swal?.fire({
        icon: "warning",
        title: "Passwords Mismatch",
        text: "The passwords you entered do not match.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff9f43",
      });
      return;
    }

    window.Swal?.fire({
      title: "Resetting Password...",
      text: "Updating secure credentials.",
      allowOutsideClick: false,
      background: "#1a1a1a",
      color: "#fff",
      didOpen: () => window.Swal?.showLoading(),
    });

    try {
      await postJSON("/api/forgot-password", { email: email.trim().toLowerCase(), newPassword });
      await window.Swal?.fire({
        icon: "success",
        title: "Password Reset Successful",
        text: "Your password has been changed successfully! Redirecting to login gateway.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
      });
      router.push("/admin");
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      window.Swal?.fire({
        icon: "error",
        title: "Reset Failed",
        text: apiErr?.message || "Failed to reset security password",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    }
  };

  return (
    <div
      style={{
        background: "radial-gradient(circle at 50% 50%, #1a1a1a 0%, #050505 100%)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "rgba(20, 20, 20, 0.6)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(224, 194, 20, 0.15)",
          padding: "45px 40px",
          borderRadius: "var(--radius-md)",
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          position: "relative",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <img
            src="/assets/logo/ISV2.png"
            alt="SSB Seal"
            style={{ height: 70, width: 70, objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(224, 194, 20, 0.25))", marginBottom: 15 }}
          />
          <h2 style={{ fontWeight: 800, color: "#fff", marginBottom: 6, fontSize: "1.6rem" }}>Account Recovery</h2>
          <p style={{ color: "var(--text-white)", opacity: 0.5, fontSize: "0.85rem" }}>Verify your credentials to reset secure password</p>
        </div>

        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendOtp();
            }}
          >
            <div className="form-floating mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label>Email Address</label>
            </div>
            <small className="text-muted d-block mb-3">
              <i className="fas fa-info-circle"></i> Enter your registered email address.
            </small>
            <button type="submit" className="recovery-btn">
              <i className="fas fa-paper-plane me-2"></i> Send Verification OTP
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyOtpCode}>
            <p className="small text-muted mb-4">
              <i className="fas fa-envelope-open-text me-1 text-warning"></i> An OTP has been dispatched. Please check your inbox.
            </p>
            <div className="form-floating mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="6-digit OTP"
                required
                maxLength={6}
                pattern="\d{6}"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <label>6-Digit Verification OTP</label>
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <a
                href="javascript:void(0)"
                className="small"
                style={{ color: "var(--primary-gold)", textDecoration: "none", opacity: timer > 0 ? 0.5 : 1, pointerEvents: timer > 0 ? "none" : "auto" }}
                onClick={sendOtp}
              >
                Resend Code
              </a>
              <div style={{ fontSize: "0.85rem", color: "var(--primary-gold)", marginTop: 8 }}>
                {timer > 0 ? `Expires in: ${formatTime(timer)}` : "OTP Expired"}
              </div>
            </div>
            <button type="submit" className="recovery-btn mt-4">
              <i className="fas fa-shield-alt me-2"></i> Verify Verification Code
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={resetPassword}>
            <div className="form-floating mb-3">
              <input
                type="password"
                className="form-control"
                placeholder="New Password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <label>New Security Password</label>
            </div>
            <div className="form-floating mb-4">
              <input
                type="password"
                className="form-control"
                placeholder="Confirm Password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <label>Confirm New Password</label>
            </div>
            <button type="submit" className="recovery-btn">
              <i className="fas fa-lock me-2"></i> Reset Security Password
            </button>
          </form>
        )}

        <div className="text-center">
          <a href="/admin" className="back-link">
            <i className="fas fa-arrow-left"></i> Back to Gateway Authenticate
          </a>
        </div>
      </div>
    </div>
  );
}
