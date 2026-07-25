"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CustomButton from "@/components/site/CustomButton";
import { BiArrowBack } from "react-icons/bi";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { postJSON, ApiError } from "@/lib/authApi";
import "@/style/custom-theme.css";

// ─── Password strength helpers ───
const passwordRules = [
  { key: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { key: "number", label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { key: "special", label: "One special character (!@#$...)", test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

const getPasswordStrength = (password: string) => {
  if (!password) return { score: 0, label: "", color: "" };
  const passed = passwordRules.filter((r) => r.test(password)).length;
  if (passed <= 1) return { score: 1, label: "Weak", color: "#ef4444" };
  if (passed === 2) return { score: 2, label: "Fair", color: "#f59e0b" };
  if (passed === 3) return { score: 3, label: "Good", color: "#3b82f6" };
  return { score: 4, label: "Strong", color: "#22c55e" };
};

/**
 * Account recovery / forgot-password flow for student/lead accounts.
 *
 * NOTE on scope vs. the legacy page: the legacy AccountRecovery.jsx supported
 * BOTH email and phone identifiers, with phone OTP sent by calling MSG91's
 * public widget API *directly from the browser* using a hardcoded
 * `tokenAuth`/`widgetId` pair baked into the frontend bundle. That pattern
 * (client-embedded third-party API secret, bypassing our own backend) is
 * exactly the kind of thing this migration is removing — it is not ported.
 *
 * This page talks to /api/student/forgot-password/{send-otp,verify-otp,reset}
 * (built in Phase 4), which — unlike /api/send-otp + /api/forgot-password
 * (admin/franchise/assessor only) — is scoped to student/lead accounts, closing
 * the gap Phase 3 surfaced (students previously had no self-service reset path).
 */
function AccountRecovery() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    identifier: "", // Email only (see note above)
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [resetToken, setResetToken] = useState("");

  const [step, setStep] = useState(1); // 1: Enter identifier, 2: Enter OTP, 3: Set password
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timer, setTimer] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Timer effect
  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => {
        setTimer(timer - 1);
      }, 1000);
    } else if (timer === 0 && otpSent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("OTP has expired. Please request a new one.");
      setOtpSent(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timer, otpSent]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "otp") {
      newValue = value.replace(/\D/g, "").slice(0, 6);
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));
    if (error) setError("");
  };

  const validateIdentifier = () => {
    const identifier = formData.identifier.trim();
    if (!identifier) {
      setError("Please enter your registered email address");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      setError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const validateOtp = () => {
    if (!formData.otp.trim()) {
      setError("Please enter the OTP");
      return false;
    }
    if (formData.otp.length < 4 || formData.otp.length > 6) {
      setError("OTP must be between 4 and 6 digits");
      return false;
    }
    return true;
  };

  const validatePassword = () => {
    if (!formData.newPassword.trim()) {
      setError("Please enter new password");
      return false;
    }
    if (!passwordRules.every((r) => r.test(formData.newPassword))) {
      setError("Password must be at least 8 characters with uppercase, number, and special character");
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    if (!validateIdentifier()) return;

    setIsLoading(true);
    setError("");

    try {
      const identifier = formData.identifier.trim().toLowerCase();
      await postJSON("/api/student/forgot-password/send-otp", { email: identifier });

      setSuccess("OTP sent successfully! Please check your email.");
      setOtpSent(true);
      setTimer(300);
      setStep(2);
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setError((apiErr?.data?.message as string) || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    if (!validateOtp()) return;
    if (timer === 0) {
      setError("OTP has expired. Please request a new one.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const identifier = formData.identifier.trim().toLowerCase();
      const data = await postJSON<{ resetToken: string }>("/api/student/forgot-password/verify-otp", {
        email: identifier,
        otp: formData.otp,
      });
      setResetToken(data.resetToken);
      setSuccess("OTP verified successfully!");
      setStep(3);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setError((apiErr?.data?.message as string) || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!validatePassword()) return;

    setIsLoading(true);
    setError("");

    try {
      const identifier = formData.identifier.trim().toLowerCase();
      await postJSON("/api/student/forgot-password/reset", {
        email: identifier,
        resetToken,
        newPassword: formData.newPassword,
      });

      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/SignIn");
      }, 2000);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.status === 410) {
        setError("OTP session expired. Please start over");
        setStep(1);
      } else {
        setError((apiErr?.data?.message as string) || (apiErr?.data?.error as string) || "Failed to reset password");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) {
      setError(`Please wait ${timer} seconds before resending OTP`);
      return;
    }
    await handleSendOtp();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="thm-content-layer">
      <div className="thm-content-bg"></div>
      <div onClick={() => router.back()} className="arrow_button">
        <BiArrowBack />
      </div>

      <div className="container position-relative">
        <h1 className="thm-big-title">Account Recovery</h1>

        {success && (
          <div className="alert alert-success col-xl-7 col-lg-9 mx-auto" role="alert">
            {success}
          </div>
        )}

        {error && (
          <div className="alert alert-danger col-xl-7 col-lg-9 mx-auto" role="alert">
            {error}
          </div>
        )}

        {/* Step 1: Enter Email */}
        {step === 1 && (
          <div className="position-relative" style={{ zIndex: "55555" }}>
            <div className="row col-xl-7 g-4 g-md-2 col-lg-9 mx-auto justify-content-center">
              <div className="col-lg-12">
                <input
                  type="email"
                  name="identifier"
                  className="form-control thm-input"
                  placeholder="Enter Your Registered Email Address"
                  value={formData.identifier}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  autoComplete="username"
                />
                <small className="form-text text-muted mt-1">Enter the email address registered on your account</small>
              </div>

              <div className="col-12 text-center mt-4">
                <div className="d-flex justify-content-center">
                  <CustomButton text={isLoading ? "SENDING..." : "SEND OTP"} onClick={handleSendOtp} disabled={isLoading} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Enter OTP */}
        {step === 2 && (
          <div className="position-relative" style={{ zIndex: "55555" }}>
            <div className="row col-xl-7 g-4 g-md-2 mt-5 pt-5 col-lg-9 mx-auto justify-content-center">
              <div className="col-lg-12">
                <input
                  ref={otpInputRef}
                  type="text"
                  name="otp"
                  className="form-control thm-input"
                  placeholder="Enter OTP"
                  value={formData.otp}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>

              <div className="col-lg-12 text-end mt-2">
                {timer > 0 ? (
                  <div className="thm-account-link">OTP expires in: {formatTime(timer)}</div>
                ) : (
                  <div className="thm-account-link" onClick={handleResendOtp} style={{ cursor: "pointer", color: "#007bff" }}>
                    Resend OTP
                  </div>
                )}
              </div>

              <div className="col-12 text-center mt-4">
                <div className="d-flex justify-content-center">
                  <CustomButton text={isLoading ? "VERIFYING..." : "VERIFY OTP"} onClick={handleVerifyOtp} disabled={isLoading} />
                </div>
              </div>

              <div className="col-12 text-center mt-3">
                <div className="thm-account-link" onClick={() => setStep(1)} style={{ cursor: "pointer" }}>
                  ← Back to change email
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Set New Password */}
        {step === 3 && (
          <div className="position-relative" style={{ zIndex: "55555" }}>
            <div className="row col-xl-7 g-4 g-md-2 mt-5 pt-5 col-lg-9 mx-auto justify-content-center">
              <div className="col-lg-12 position-relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  className="form-control thm-input"
                  placeholder="Enter New Password"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  autoComplete="new-password"
                  style={{ paddingRight: "45px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: "absolute",
                    right: "25px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.4)",
                    cursor: "pointer",
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  {showNewPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                </button>
              </div>

              <div className="col-lg-12 mt-3 position-relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  className="form-control thm-input"
                  placeholder="Confirm New Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  autoComplete="new-password"
                  style={{ paddingRight: "45px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "25px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.4)",
                    cursor: "pointer",
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  {showConfirmPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                </button>
              </div>

              <div className="col-lg-12 mt-2">
                {formData.newPassword &&
                  (() => {
                    const str = getPasswordStrength(formData.newPassword);
                    return (
                      <div className="password-strength-section">
                        <div className="password-strength-bar">
                          <div className="password-strength-fill" style={{ width: `${(str.score / 4) * 100}%`, background: str.color }}></div>
                        </div>
                        <span className="password-strength-label" style={{ color: str.color }}>
                          {str.label}
                        </span>
                        <div className="password-rules">
                          {passwordRules.map((rule) => (
                            <div key={rule.key} className={`password-rule ${rule.test(formData.newPassword) ? "passed" : "failed"}`}>
                              <span>{rule.test(formData.newPassword) ? "✓" : "✗"}</span> {rule.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
              </div>

              <div className="col-12 text-center mt-4">
                <div className="d-flex justify-content-center">
                  <CustomButton
                    text={isLoading ? "RESETTING..." : "RESET PASSWORD"}
                    onClick={handleResetPassword}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="col-12 text-center mt-3">
                <div className="thm-account-link" onClick={() => setStep(2)} style={{ cursor: "pointer" }}>
                  ← Back to OTP verification
                </div>
              </div>
            </div>
          </div>
        )}

        <span style={{ zIndex: "567" }} className="thm-glow"></span>
      </div>
    </div>
  );
}

export default AccountRecovery;
