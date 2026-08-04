"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CustomButton from "@/components/site/CustomButton";
import SocialLoginButtons from "@/components/site/SocialLoginButtons";
import toast from "react-hot-toast";
import { BiArrowBack } from "react-icons/bi";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { ApiError } from "@/lib/authApi";
import "@/style/custom-theme.css";

interface AuthDisplaySettings {
  mode?: "slideshow" | "ad";
  slideshowImages?: string[];
  adImage?: string;
  adLink?: string;
  transitionValue?: number;
  transitionUnit?: "seconds" | "minutes" | "hours" | "days";
}

interface FormData {
  loginId: string;
  password: string;
  rememberMe: boolean;
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Show success toast if redirected from signup (?registered=true)
  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      toast.success("Account created successfully! Please sign in.");
      // Clear the query param so it doesn't show again on refresh
      window.history.replaceState({}, document.title, "/SignIn");
    }
  }, [searchParams]);

  // Which portal the credentials are being checked against — lets a person
  // whose email is shared between a staff account and a student account log
  // into either one explicitly, instead of the backend silently picking
  // whichever collection it checks first.
  const [portal, setPortal] = useState<"student" | "admin">("student");

  // Form state
  const [formData, setFormData] = useState<FormData>({
    loginId: "",
    password: "",
    rememberMe: true,
  });

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState({ loginId: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

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

    // Convert transition value to milliseconds
    const value = displaySettings.transitionValue || 1;
    const unit = displaySettings.transitionUnit || "days";
    const msMap: Record<string, number> = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 };
    const intervalMs = value * (msMap[unit] || 86400000);

    // Calculate which image index based on current time divided by interval
    const nowMs = Date.now() - new Date().getTimezoneOffset() * 60000;
    const index = Math.floor(nowMs / intervalMs) % images.length;
    setCurrentImageIndex(index);
  }, [displaySettings]);

  // Lockout timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (lockoutTimer > 0) {
      interval = setInterval(() => setLockoutTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // Handle input changes with inline validation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    let newValue: string | boolean = value;

    if (name === "loginId") {
      if (/^\d+$/.test(value)) {
        newValue = value.slice(0, 10);
      }
    }

    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : newValue }));

    // Clear errors on type
    if (error) setError("");
    if (fieldErrors[name as keyof typeof fieldErrors]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Identify login type
  const identifyLoginType = (loginId: string): "phone" | "email" | "unknown" => {
    const digitsOnly = loginId.replace(/\D/g, "");
    if (/^[+]?[0-9\s\-()]+$/.test(loginId) && digitsOnly.length >= 10) return "phone";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginId)) return "email";
    return "unknown";
  };

  // Validate individual fields
  const validateField = (name: "loginId" | "password", value: string) => {
    let err = "";
    if (name === "loginId") {
      if (!value.trim()) err = "Please enter your email or phone number";
      else {
        const type = identifyLoginType(value);
        if (type === "unknown") err = "Please enter a valid email address or 10-digit phone number";
        else if (type === "phone" && value.replace(/\D/g, "").length < 10) err = "Phone number must be at least 10 digits";
      }
    }
    if (name === "password") {
      if (!value.trim()) err = "Please enter your password";
    }
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
    return !err;
  };

  const formatPhoneNumber = (phone: string) => phone.replace(/\D/g, "");

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();

    // Rate limiting
    if (lockoutTimer > 0) {
      setError(`Too many failed attempts. Please try again in ${lockoutTimer} seconds.`);
      return;
    }

    // Validate fields
    const isLoginIdValid = validateField("loginId", formData.loginId);
    const isPasswordValid = validateField("password", formData.password);
    if (!isLoginIdValid || !isPasswordValid) return;

    setError("");
    setIsLoginLoading(true);

    try {
      const loginType = identifyLoginType(formData.loginId);
      const requestData: { password: string; email?: string; phone?: string } = { password: formData.password };

      if (loginType === "email") {
        requestData.email = formData.loginId.trim().toLowerCase();
      } else if (loginType === "phone") {
        requestData.phone = formatPhoneNumber(formData.loginId);
      }

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...requestData, portal }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new ApiError(data?.error || "Login failed", data, res.status);
      }

      // NOTE: no token handling here — /api/login already set the httpOnly
      // session cookie server-side. The browser never sees the token.

      // Reset failed attempts on success
      setFailedAttempts(0);

      toast.success("Logged in successfully!");

      // An admin/assessor/franchise account may land on this page (e.g. a
      // session-expired redirect from Candidate Evaluation) — route them to
      // the right portal instead of the student dashboard.
      const role = data?.role;
      if (role === "franchise") {
        router.push("/admin/FranchiseDashboard");
      } else if (role === "owner" || role === "admin" || role === "assessor") {
        router.push("/admin/Profile");
      } else {
        router.push("/ProfileDashboard");
      }
      router.refresh();
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      // Wrong password / wrong portal / lockout are expected outcomes
      // already surfaced to the user below via setError() — logging them as
      // console.error trips Next's dev-mode error overlay on every failed
      // login attempt. Only unexpected failures (network error, 5xx) get
      // logged here.
      if (!apiErr || apiErr.status >= 500) {
        console.error("Login error:", apiErr?.data?.error || err);
      }

      // Track failed attempts
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 3) {
        setLockoutTimer(30);
        setFailedAttempts(0);
        setError("Too many failed attempts. Please wait 30 seconds.");
        setIsLoginLoading(false);
        return;
      }

      const backendError = apiErr?.data?.error as string | undefined;
      if (backendError === "User not found") {
        // Doesn't confirm whether this email/phone actually belongs to the
        // other portal — just a generic nudge, so this can't be used to
        // enumerate which accounts exist as staff vs. student.
        setError(
          portal === "student"
            ? "No student account found with those details. Staff members should use the Admin Portal tab above."
            : "No staff account found with those details. Students should use the Student tab above."
        );
      } else if (backendError) {
        setError(backendError);
      } else {
        setError("An error occurred. Please try again");
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoginLoading) {
      handleSubmit(e);
    }
  };

  const isDisabled = isLoginLoading || lockoutTimer > 0;

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
        <div onClick={() => router.back()} className="auth-back-arrow">
          <BiArrowBack />
        </div>

        <div className="auth-card">
          <div className="auth-logo-wrapper">
            <img src="/assets/logo/ISV.webp" alt="SSB with ISV Logo" className="auth-logo" />
          </div>
          <h1 className="auth-card-title">Sign In</h1>

          <div className="portal-toggle" role="tablist" aria-label="Login as">
            <button
              type="button"
              role="tab"
              aria-selected={portal === "student"}
              className={`portal-toggle-btn ${portal === "student" ? "active" : ""}`}
              onClick={() => setPortal("student")}
              disabled={isDisabled}
            >
              Student
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={portal === "admin"}
              className={`portal-toggle-btn ${portal === "admin" ? "active" : ""}`}
              onClick={() => setPortal("admin")}
              disabled={isDisabled}
            >
              Admin Portal
            </button>
          </div>

          <div className="row g-3 justify-content-center" onKeyDown={handleKeyDown}>
            {/* Login ID */}
            <div className="col-lg-12">
              <input
                type="text"
                name="loginId"
                className={`form-control thm-input ${fieldErrors.loginId ? "is-invalid" : ""}`}
                placeholder="Enter Your Email or Phone Number"
                value={formData.loginId}
                onChange={handleInputChange}
                onBlur={() => validateField("loginId", formData.loginId)}
                disabled={isDisabled}
                autoComplete="username"
              />
              {fieldErrors.loginId && <div className="field-error">{fieldErrors.loginId}</div>}
            </div>

            {/* Password */}
            <div className="col-lg-12 mt-3">
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className={`form-control thm-input ${fieldErrors.password ? "is-invalid" : ""}`}
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={() => validateField("password", formData.password)}
                  disabled={isDisabled}
                  autoComplete="current-password"
                />
                <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                </span>
              </div>
              {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
            </div>

            {/* Remember me + Forgot password */}
            <div className="col-6 mt-4">
              <label className="thm-checkbox">
                <input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleInputChange} disabled={isDisabled} />
                <span className="thm-checkmark"></span>
                Remember me
              </label>
            </div>

            <div
              onClick={() => !isDisabled && router.push(portal === "admin" ? "/admin/AccountRecovery" : "/AccountRecovery")}
              className="col-6 mt-4 text-end"
            >
              <div className="thm-account-link" style={{ cursor: isDisabled ? "not-allowed" : "pointer", opacity: isDisabled ? 0.6 : 1 }}>
                Forgot Password?
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="col-lg-12">
                <p className="field-error text-center" style={{ fontSize: "16px" }}>
                  {error}
                </p>
              </div>
            )}

            {/* Submit */}
            <div className="col-12 d-flex justify-content-center mt-5">
              <CustomButton
                text={lockoutTimer > 0 ? `WAIT ${lockoutTimer}s` : isLoginLoading ? "SIGNING IN..." : "SIGN IN"}
                onClick={handleSubmit}
                disabled={isDisabled}
              />
            </div>

            {portal === "student" && (
              <>
                <SocialLoginButtons />

                {/* Signup link */}
                <div className="col-12 text-center mt-5">
                  <div
                    onClick={() => !isDisabled && router.push("/SignUp")}
                    className="thm-account-link"
                    style={{ cursor: isDisabled ? "not-allowed" : "pointer", opacity: isDisabled ? 0.6 : 1 }}
                  >
                    Create a new account.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
