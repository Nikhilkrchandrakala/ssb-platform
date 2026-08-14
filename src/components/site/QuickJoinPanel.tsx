"use client";

import { useState } from "react";
import { postJSON, ApiError } from "@/lib/authApi";
import ZohoQuickJoinForm from "./ZohoQuickJoinForm";

/**
 * Inline "Join SSB Batch" auth panel for a logged-out visitor — replaces
 * the old redirect to the full multi-step /SignUp page for this one entry
 * point (src/app/(site)/Batches/BatchesView.tsx). Two views:
 *  - Quick Join (default): the client's Zoho embed (ZohoQuickJoinForm) —
 *    submitting it fires the pasted form's own Zoho POST *and* our own
 *    POST /api/quickJoin in parallel, which silently signs the visitor in
 *    as a passwordless lead so they can go straight into checkout.
 *  - Log In: for a returning visitor whose email already has a real
 *    account/password — posts to the existing /api/login, unmodified.
 * Both paths call `onAuthenticated()` on success, which the parent uses to
 * `router.refresh()` so the newly-set session cookie is picked up.
 */
export default function QuickJoinPanel({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [view, setView] = useState<"quickJoin" | "login">("quickJoin");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleQuickJoinSubmit = async (fields: { name: string; email: string; phone: string }) => {
    setIsSubmitting(true);
    setError("");
    try {
      await postJSON("/api/quickJoin", fields);
      onAuthenticated();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setLoginEmail(fields.email);
        setNotice(err.message);
        setView("login");
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
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

  if (view === "login") {
    return (
      <div style={{ padding: "10px 0" }}>
        <h4 style={{ color: "#f4c430", marginBottom: 12 }}>Log In</h4>
        {notice && (
          <p style={{ color: "#f4c430", fontSize: 13, marginBottom: 12 }}>{notice}</p>
        )}
        <form onSubmit={handleLoginSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              marginBottom: 10,
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              marginBottom: 10,
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
            }}
          />
          {error && <p style={{ color: "#e0806a", fontSize: 13, marginBottom: 10 }}>{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 6,
              border: "none",
              fontWeight: 700,
              cursor: isSubmitting ? "default" : "pointer",
              background: "linear-gradient(0deg, #C5A028 0%, #E0C214 100%)",
              color: "#0b0b0b",
            }}
          >
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setView("quickJoin");
            setError("");
            setNotice("");
          }}
          style={{ background: "none", border: "none", color: "#c6c5af", fontSize: 13, marginTop: 12, cursor: "pointer", textDecoration: "underline" }}
        >
          ← New here? Join in 30 seconds
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "10px 0" }}>
      <h4 style={{ color: "#f4c430", marginBottom: 4 }}>Just a few details to continue</h4>
      <p style={{ color: "#c6c5af", fontSize: 13, marginBottom: 12 }}>
        No password, no OTP — fill this in and you&apos;ll go straight to payment.
      </p>
      {error && <p style={{ color: "#e0806a", fontSize: 13, marginBottom: 10 }}>{error}</p>}
      {isSubmitting && <p style={{ color: "#c6c5af", fontSize: 13, marginBottom: 10 }}>Setting things up…</p>}
      <ZohoQuickJoinForm onSubmitAttempt={handleQuickJoinSubmit} />
      <button
        type="button"
        onClick={() => setView("login")}
        style={{ background: "none", border: "none", color: "#c6c5af", fontSize: 13, marginTop: 8, cursor: "pointer", textDecoration: "underline" }}
      >
        Already have an account? Log in
      </button>
    </div>
  );
}
