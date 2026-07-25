"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import "@/style/SocialLogin.css"; // for .oauth-spinner
import "@/style/custom-theme.css";

/**
 * /auth/callback
 * Landing page after OAuth login for EXISTING users (have a verified phone).
 *
 * Legacy behavior: read `?token=...&user=...` from the URL, store the JWT in
 * localStorage, then navigate home.
 *
 * New behavior: src/server/integrations/oauth.ts's `oauthCallback` already
 * exchanged the provider's code, found/created the User, called
 * `setSessionCookie` itself, and only THEN redirected here — with no token
 * or user payload in the query string at all. On failure it redirects here
 * with `?oauthError=true` instead. So this page has nothing to read/store;
 * it just reacts to which case it landed in and moves on.
 */
function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const oauthError = searchParams.get("oauthError");

    if (oauthError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Sign in was cancelled or failed. Please try again.");
      const t = setTimeout(() => router.replace("/SignIn"), 3000);
      return () => clearTimeout(t);
    }

    toast.success("Logged in successfully!");
    // Re-run the (site) layout's server-side getCurrentUser() so the
    // Sidebar/Navbar immediately reflect the session cookie set by the
    // callback Route Handler, then move on to the dashboard.
    router.replace("/ProfileDashboard");
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="thm-content-layer">
      <div className="thm-content-bg"></div>
      <div
        className="container position-relative d-flex flex-column align-items-center justify-content-center"
        style={{ minHeight: "60vh" }}
      >
        {error ? (
          <div className="text-center">
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>⚠️</div>
            <p className="field-error" style={{ fontSize: "18px" }}>
              {error}
            </p>
            <p style={{ color: "#c6c5af", marginTop: "12px" }}>Redirecting you back...</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="oauth-spinner"></div>
            <p style={{ color: "#f4c430", fontSize: "20px", fontWeight: 600, marginTop: "24px" }}>Signing you in...</p>
            <p style={{ color: "#c6c5af", fontSize: "14px", marginTop: "8px" }}>Please wait a moment</p>
          </div>
        )}
        <span className="thm-glow"></span>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackInner />
    </Suspense>
  );
}
