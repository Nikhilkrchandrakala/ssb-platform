"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CustomButton from "@/components/site/CustomButton";
import SocialLoginButtons from "@/components/site/SocialLoginButtons";
import TurnstileWidget from "@/components/TurnstileWidget";
import { BiArrowBack } from "react-icons/bi";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import toast from "react-hot-toast";
import { postJSON, ApiError } from "@/lib/authApi";
import "@/style/MagazineGateForm.css";
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

interface AuthDisplaySettings {
  mode?: "slideshow" | "ad";
  slideshowImages?: string[];
  adImage?: string;
  adLink?: string;
  transitionValue?: number;
  transitionUnit?: "seconds" | "minutes" | "hours" | "days";
}

type FieldName = "name" | "email" | "phone" | "password" | "confirmPassword" | "serviceConsent";

export default function SignUp() {
  const router = useRouter();

  // Auth Display Settings slideshow/ad logic
  const [displaySettings, setDisplaySettings] = useState<AuthDisplaySettings | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetch("/api/authDisplaySettings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDisplaySettings(data))
      .catch(() => setDisplaySettings(null));
  }, []);

  const getAuthImages = () => {
    if (displaySettings) {
      if (displaySettings.mode === "slideshow" && displaySettings.slideshowImages && displaySettings.slideshowImages.length > 0) {
        return displaySettings.slideshowImages;
      } else if (displaySettings.mode === "ad" && displaySettings.adImage) {
        return [displaySettings.adImage];
      }
    }
    return ["/assets/website/courses_banner.webp"];
  };

  const authImages = getAuthImages();

  useEffect(() => {
    if (!displaySettings || displaySettings.mode !== "slideshow") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentImageIndex(0);
      return;
    }
    const images = displaySettings.slideshowImages || [];
    if (images.length === 0) {
      setCurrentImageIndex(0);
      return;
    }

    const value = displaySettings.transitionValue || 1;
    const unit = displaySettings.transitionUnit || "days";
    const msMap: Record<string, number> = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 };
    const intervalMs = value * (msMap[unit] || 86400000);

    const nowMs = Date.now() - new Date().getTimezoneOffset() * 60000;
    const index = Math.floor(nowMs / intervalMs) % images.length;
    setCurrentImageIndex(index);
  }, [displaySettings]);

  // ─── Step state (1=Info, 2=Email OTP, 3=Phone OTP, 4=SSB Profile) ───
  const [step, setStep] = useState(1);

  // ─── Form states ───
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ─── Step 4 SSB Profile Form State ───
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

  // OTP states
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneReqId, setPhoneReqId] = useState("");

  // Verification tokens
  const [emailVerifyToken, setEmailVerifyToken] = useState("");
  const [phoneVerifyToken, setPhoneVerifyToken] = useState("");

  // UI states
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Timer states
  const [emailTimer, setEmailTimer] = useState(0);
  const [phoneTimer, setPhoneTimer] = useState(0);

  // Field errors
  const [fieldErrors, setFieldErrors] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "", serviceConsent: "",
  });
  const [serviceConsent, setServiceConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  // Refs
  const otpInputRef = useRef<HTMLInputElement>(null);

  // ─── Timers ───
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (emailTimer > 0) {
      interval = setInterval(() => setEmailTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [emailTimer]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (phoneTimer > 0) {
      interval = setInterval(() => setPhoneTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [phoneTimer]);

  // ─── Validation ───
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isValidPhone = (p: string) => /^[0-9]{10}$/.test(p);
  const isStrongPassword = (p: string) => passwordRules.every((r) => r.test(p));

  const validateField = (field: FieldName, value: string | boolean) => {
    let err = "";
    switch (field) {
      case "name":
        if (!(value as string).trim()) err = "Name is required";
        else if ((value as string).trim().length < 2) err = "Name must be at least 2 characters";
        break;
      case "email":
        if (!value) err = "Email is required";
        else if (!isValidEmail(value as string)) err = "Please enter a valid email address";
        break;
      case "phone":
        if (!value) err = "Phone number is required";
        else if (!isValidPhone(value as string)) err = "Please enter a valid 10-digit phone number";
        break;
      case "password":
        if (!value) err = "Password is required";
        else if (!isStrongPassword(value as string)) err = "Password does not meet all requirements";
        break;
      case "confirmPassword":
        if (!value) err = "Please confirm your password";
        else if (value !== password) err = "Passwords do not match";
        break;
      case "serviceConsent":
        if (!value) err = "You must agree to the terms and conditions";
        break;
      default:
        break;
    }
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    return !err;
  };

  // ─── Field handlers ───
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setName(v);
    validateField("name", v);
  };
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setEmail(v);
    validateField("email", v);
  };
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "");
    if (v.length <= 10) {
      setPhone(v);
      validateField("phone", v);
    }
  };
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setPassword(v);
    validateField("password", v);
    if (confirmPassword) validateField("confirmPassword", confirmPassword);
  };
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setConfirmPassword(v);
    validateField("confirmPassword", v);
  };
  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const c = e.target.checked;
    setServiceConsent(c);
    validateField("serviceConsent", c);
  };

  // ─── STEP 1: Validate & Check User Exists ───
  const handleStep1Continue = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    const values: Record<string, string | boolean> = { name, email, phone, password, confirmPassword, serviceConsent };
    const valid = (["name", "email", "phone", "password", "confirmPassword", "serviceConsent"] as FieldName[])
      .map((f) => validateField(f, values[f]))
      .every(Boolean);

    if (!valid) {
      setErrorMsg("Please fix all errors before continuing.");
      return;
    }
    if (!turnstileToken) {
      setErrorMsg("Please complete the verification challenge before continuing.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const result = await postJSON<{ exists: boolean; message?: string }>("/api/check-user-exists", { email, phone });
      if (result.exists) {
        setErrorMsg(result.message || "An account with this email or phone already exists.");
        setLoading(false);
        return;
      }
      // Move to Step 2 — send email OTP
      await handleSendEmailOtp();
      setStep(2);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setErrorMsg((apiErr?.data?.error as string) || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 2: Email OTP ───
  const handleSendEmailOtp = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await postJSON("/api/signup/send-email-otp", { email, turnstileToken });
      setSuccessMsg("Verification OTP sent to " + email);
      setEmailTimer(300);
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setErrorMsg((apiErr?.data?.message as string) || "Failed to send email OTP");
    }
  };

  const handleVerifyEmailOtp = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!emailOtp || emailOtp.length < 4 || emailOtp.length > 6) {
      setErrorMsg("Please enter a valid OTP");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      const result = await postJSON<{ success: boolean; message?: string; emailVerifyToken?: string }>("/api/signup/verify-email-otp", {
        email,
        otp: emailOtp,
      });
      if (result.success) {
        setEmailVerifyToken(result.emailVerifyToken || "");
        setSuccessMsg("Email verified! Now let's verify your phone.");
        // Move to step 3 — send phone OTP
        await handleSendPhoneOtp();
        setStep(3);
      } else {
        setErrorMsg(result.message || "Invalid OTP");
      }
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setErrorMsg((apiErr?.data?.message as string) || "Email OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 3: Phone OTP ───
  const handleSendPhoneOtp = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const result = await postJSON<{ success: boolean; reqId?: string }>("/api/signup/send-phone-otp", { phone });
      if (result.success) {
        setPhoneReqId(result.reqId || "");
        setSuccessMsg("OTP sent to +91 " + phone);
        setPhoneTimer(30);
        setTimeout(() => otpInputRef.current?.focus(), 100);
      } else {
        setErrorMsg("Failed to send phone OTP");
      }
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setErrorMsg((apiErr?.data?.message as string) || "Failed to send phone OTP");
    }
  };

  const handleVerifyPhoneAndRegister = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!phoneOtp || phoneOtp.length < 4 || phoneOtp.length > 6) {
      setErrorMsg("Please enter a valid OTP");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      // Verify phone OTP
      const verifyResult = await postJSON<{ success: boolean; message?: string; phoneVerifyToken?: string }>(
        "/api/signup/verify-phone-otp",
        { phone, otp: phoneOtp, reqId: phoneReqId }
      );
      if (!verifyResult.success) {
        setErrorMsg(verifyResult.message || "Invalid OTP");
        setLoading(false);
        return;
      }
      setPhoneVerifyToken(verifyResult.phoneVerifyToken || "");

      // Successfully verified! Move to Step 4 (SSB Details Profile)
      setStep(4);
      setErrorMsg("");
      setSuccessMsg("Phone verified successfully! Please fill in your SSB profile details to complete registration.");
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      console.error("Phone OTP verification error:", err);
      setErrorMsg((apiErr?.data?.message as string) || "Phone OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 4: Submit Full Profile and Register ───
  const handleSSBSubmitAndRegister = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();

    // Basic validations for Step 4
    if (ssbAspirant === "-None-") {
      setErrorMsg("Please select if you are an SSB Aspirant.");
      return;
    }
    if (servingCandidate === "-None-") {
      setErrorMsg("Please select if you are a serving candidate.");
      return;
    }

    setErrorMsg("");
    setLoading(true);
    try {
      // Register user with all fields (Signup + SSB Details).
      // /api/register does NOT return a token or set a session cookie —
      // registration and login are separate steps here, matching how the
      // Route Handler is written (it only creates the user document).
      await postJSON("/api/register", {
        name, email, phone, password,
        emailVerifyToken,
        phoneVerifyToken,
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

      // Add lead locally in DB if needed (best-effort, ignore failures)
      try {
        await postJSON("/api/addLead", { name, email, phoneNumber: phone });
      } catch (leadErr) {
        console.error("Add lead error:", leadErr);
      }

      toast.success("Registration completed successfully!");
      router.push("/SignIn?registered=true");
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      console.error("Registration error:", err);
      setErrorMsg((apiErr?.data?.error as string) || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Format timer ───
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // ─── Password strength ───
  const strength = getPasswordStrength(password);

  // ─── Render ───
  return (
    <div className="auth-split-container">
      <div className="auth-split-image-panel">
        {displaySettings?.mode === "ad" && displaySettings?.adLink ? (
          <a href={displaySettings.adLink} target="_blank" rel="noopener noreferrer" className="auth-split-ad-link">
            <img key={currentImageIndex} src={authImages[currentImageIndex]} alt="Advertisement banner" />
          </a>
        ) : (
          <img key={currentImageIndex} src={authImages[currentImageIndex]} alt="SSB preparation" className="auth-split-image" />
        )}
      </div>

      <div className="auth-split-form-panel">
        <div onClick={() => (step > 1 ? setStep(step - 1) : router.back())} className="auth-back-arrow">
          <BiArrowBack />
        </div>

        <div className={`auth-card ${step === 4 ? "auth-card-wide" : ""}`}>
          <div className="auth-logo-wrapper">
            <img src="/assets/logo/ISV.webp" alt="SSB with ISV Logo" className="auth-logo" />
          </div>
          <h1 className="auth-card-title">Sign Up</h1>

          {/* Step Progress Indicator */}
          <div className="step-indicator mb-4">
            {[
              { num: 1, label: "Your Info" },
              { num: 2, label: "Verify Email" },
              { num: 3, label: "Verify Phone" },
              { num: 4, label: "SSB Profile" },
            ].map((s, i) => (
              <Fragment key={s.num}>
                <div className={`step-item ${step >= s.num ? "active" : ""} ${step > s.num ? "completed" : ""}`}>
                  <div className="step-circle">{step > s.num ? "✓" : s.num}</div>
                  <div className="step-label">{s.label}</div>
                </div>
                {i < 3 && <div className={`step-line ${step > s.num ? "active" : ""}`}></div>}
              </Fragment>
            ))}
          </div>

          {/* STEP 1: BASIC INFO */}
          {step === 1 && (
            <div className="row g-3 justify-content-center">
              <div className="col-lg-12">
                <input
                  type="text"
                  className={`form-control thm-input ${fieldErrors.name ? "is-invalid" : ""}`}
                  placeholder="Your Full Name"
                  value={name}
                  onChange={handleNameChange}
                  onBlur={() => validateField("name", name)}
                  required
                />
                {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
              </div>

              <div className="col-lg-12">
                <input
                  type="email"
                  className={`form-control thm-input ${fieldErrors.email ? "is-invalid" : ""}`}
                  placeholder="Your Email Address"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => validateField("email", email)}
                  required
                />
                {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
              </div>

              <div className="col-lg-12">
                <input
                  type="text"
                  className={`form-control thm-input ${fieldErrors.phone ? "is-invalid" : ""}`}
                  placeholder="Your 10-digit Phone Number"
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={() => validateField("phone", phone)}
                  maxLength={10}
                  inputMode="numeric"
                  required
                />
                {fieldErrors.phone && <div className="field-error">{fieldErrors.phone}</div>}
              </div>

              <div className="col-lg-12">
                <div className="password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`form-control thm-input password-input ${fieldErrors.password ? "is-invalid" : ""}`}
                    placeholder="Create Password"
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={() => validateField("password", password)}
                    required
                  />
                  <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                  </span>
                </div>

                {password && (
                  <div className="password-strength-section">
                    <div className="password-strength-bar">
                      <div
                        className="password-strength-fill"
                        style={{ width: `${(strength.score / 4) * 100}%`, background: strength.color }}
                      ></div>
                    </div>
                    <span className="password-strength-label" style={{ color: strength.color }}>
                      {strength.label}
                    </span>
                    <div className="password-rules">
                      {passwordRules.map((rule) => (
                        <div key={rule.key} className={`password-rule ${rule.test(password) ? "passed" : "failed"}`}>
                          <span>{rule.test(password) ? "✓" : "✗"}</span> {rule.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {fieldErrors.password && !password && <div className="field-error">{fieldErrors.password}</div>}
              </div>

              <div className="col-lg-12 mt-3">
                <div className="password-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`form-control thm-input ${fieldErrors.confirmPassword ? "is-invalid" : ""}`}
                    placeholder="Repeat Password"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    onBlur={() => validateField("confirmPassword", confirmPassword)}
                    required
                  />
                  <span className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                  </span>
                </div>
                {fieldErrors.confirmPassword && <div className="field-error">{fieldErrors.confirmPassword}</div>}
              </div>

              {errorMsg && (
                <div className="col-lg-12">
                  <p className="field-error text-center" style={{ fontSize: "16px" }}>
                    {errorMsg}
                  </p>
                </div>
              )}

              <div className="col-lg-12 mt-4 consent-wrapper">
                <label className="consent-item">
                  <span style={{ textAlign: "center" }}>
                    By submitting this form I agree to receive calls, WhatsApp messages, emails, and updates related to courses,
                    mentoring programs, events, and relevant information from <strong>SSB with ISV</strong>. I understand that I may
                    opt out of promotional communication at any time.
                  </span>
                </label>
                <label className="consent-item">
                  <input type="checkbox" checked={serviceConsent} onChange={handleConsentChange} required />
                  <span>
                    I hereby consent to <strong>SSB with ISV</strong> collecting, storing, processing, and using my personal data in
                    accordance with the{" "}
                    <span
                      className="policy-link"
                      onClick={() => router.push("/PrivacyPolicy")}
                      style={{ cursor: "pointer", color: "var(--secondary-color)" }}
                    >
                      Privacy Policy
                    </span>
                    , for the purpose of counselling, mentoring, admissions, communication, and related services. I understand that I
                    may withdraw my consent at any time by contacting the Grievance Officer.
                  </span>
                </label>
                {fieldErrors.serviceConsent && <div className="field-error">{fieldErrors.serviceConsent}</div>}
              </div>

              <div className="col-12 d-flex justify-content-center">
                <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />
              </div>

              <div className="col-12 d-flex justify-content-center mt-4">
                <CustomButton text={loading ? "Checking..." : "CONTINUE"} onClick={handleStep1Continue} disabled={loading || !turnstileToken} />
              </div>

              {/* Facebook postponed for now (2026-08-14) — Google/LinkedIn unaffected. */}
              <SocialLoginButtons hideProviders={["facebook"]} />

              <div className="col-12 text-center mt-5">
                <div onClick={() => router.push("/SignIn")} className="thm-account-link" style={{ cursor: "pointer" }}>
                  I already have an account.
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: EMAIL OTP */}
          {step === 2 && (
            <div className="row g-3 justify-content-center">
              <div className="col-lg-12 text-center mb-3">
                <p style={{ color: "#c6c5af", fontSize: "18px", lineHeight: "1.6" }}>
                  We&apos;ve sent a verification code to
                  <br />
                  <strong style={{ color: "#f4c430" }}>{email}</strong>
                </p>
              </div>

              <div className="col-lg-12">
                <input
                  ref={otpInputRef}
                  type="text"
                  className="form-control thm-input"
                  placeholder="Enter OTP"
                  value={emailOtp}
                  maxLength={6}
                  inputMode="numeric"
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    if (v.length <= 6) setEmailOtp(v);
                  }}
                />
              </div>

              <div className="col-lg-12 text-end">
                {emailTimer > 0 ? (
                  <span className="thm-account-link" style={{ cursor: "default" }}>
                    Resend in {formatTime(emailTimer)}
                  </span>
                ) : (
                  <span className="thm-account-link" onClick={handleSendEmailOtp} style={{ cursor: "pointer", color: "#f4c430" }}>
                    Resend OTP
                  </span>
                )}
              </div>

              {successMsg && (
                <div className="col-lg-12">
                  <p style={{ color: "#22c55e", textAlign: "center" }}>{successMsg}</p>
                </div>
              )}
              {errorMsg && (
                <div className="col-lg-12">
                  <p className="field-error text-center" style={{ fontSize: "16px" }}>
                    {errorMsg}
                  </p>
                </div>
              )}

              <div className="col-12 d-flex justify-content-center mt-4">
                <CustomButton
                  text={loading ? "Verifying..." : "VERIFY EMAIL"}
                  onClick={handleVerifyEmailOtp}
                  disabled={loading || emailOtp.length < 4 || emailOtp.length > 6}
                />
              </div>

              <div className="col-12 text-center mt-3">
                <div
                  className="thm-account-link"
                  onClick={() => {
                    setStep(1);
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  ← Back to edit info
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PHONE OTP */}
          {step === 3 && (
            <div className="row g-3 justify-content-center">
              <div className="col-lg-12 text-center mb-3">
                <p style={{ color: "#c6c5af", fontSize: "18px", lineHeight: "1.6" }}>
                  We&apos;ve sent a verification code to
                  <br />
                  <strong style={{ color: "#f4c430" }}>+91 {phone}</strong>
                </p>
              </div>

              <div className="col-lg-12">
                <input
                  ref={otpInputRef}
                  type="text"
                  className="form-control thm-input"
                  placeholder="Enter OTP"
                  value={phoneOtp}
                  maxLength={6}
                  inputMode="numeric"
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    if (v.length <= 6) setPhoneOtp(v);
                  }}
                />
              </div>

              <div className="col-lg-12 text-end">
                {phoneTimer > 0 ? (
                  <span className="thm-account-link" style={{ cursor: "default" }}>
                    Resend in {formatTime(phoneTimer)}
                  </span>
                ) : (
                  <span className="thm-account-link" onClick={handleSendPhoneOtp} style={{ cursor: "pointer", color: "#f4c430" }}>
                    Resend OTP
                  </span>
                )}
              </div>

              {successMsg && (
                <div className="col-lg-12">
                  <p style={{ color: "#22c55e", textAlign: "center" }}>{successMsg}</p>
                </div>
              )}
              {errorMsg && (
                <div className="col-lg-12">
                  <p className="field-error text-center" style={{ fontSize: "16px" }}>
                    {errorMsg}
                  </p>
                </div>
              )}

              <div className="col-12 d-flex justify-content-center mt-4">
                <CustomButton
                  text={loading ? "Verifying..." : "VERIFY & CONTINUE"}
                  onClick={handleVerifyPhoneAndRegister}
                  disabled={loading || phoneOtp.length < 4 || phoneOtp.length > 6}
                />
              </div>

              <div className="col-12 text-center mt-3">
                <div
                  className="thm-account-link"
                  onClick={() => {
                    setStep(2);
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  ← Back to email verification
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SSB PROFILE */}
          {step === 4 && (
            <div className="row g-3 justify-content-center mgf-wrapper" style={{ border: "none", background: "transparent", padding: 0 }}>
              <div className="col-lg-12 text-center mb-2">
                <p style={{ color: "#c6c5af", fontSize: "18px", lineHeight: "1.6" }}>
                  Complete your <strong style={{ color: "#f4c430" }}>SSB Profile</strong> to finish setup.
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

              {successMsg && (
                <div className="col-lg-12">
                  <p style={{ color: "#22c55e", textAlign: "center", margin: 0 }}>{successMsg}</p>
                </div>
              )}
              {errorMsg && (
                <div className="col-lg-12">
                  <p className="field-error text-center" style={{ fontSize: "16px", margin: 0 }}>
                    {errorMsg}
                  </p>
                </div>
              )}

              <div className="col-12 d-flex justify-content-center mt-4">
                <CustomButton
                  text={loading ? "COMPLETING REGISTRATION..." : "FINISH & REGISTER"}
                  onClick={handleSSBSubmitAndRegister}
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
