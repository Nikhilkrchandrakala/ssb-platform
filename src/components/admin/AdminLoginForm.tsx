"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { postJSON, ApiError } from "@/lib/authApi";

interface LoginResult {
  role: string;
}

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      window.Swal?.fire({
        icon: "warning",
        text: "Please enter both email and password.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await postJSON<LoginResult>("/api/AdminLogin", { email: email.trim(), password });

      await window.Swal?.fire({
        icon: "success",
        title: "Access Granted",
        text: "Welcome back to the command center.",
        timer: 1500,
        showConfirmButton: false,
        background: "#1a1a1a",
        color: "#fff",
      });

      if (result.role === "franchise") {
        router.push("/admin/FranchiseDashboard");
      } else {
        router.push("/admin/Profile");
      }
      router.refresh();
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      window.Swal?.fire({
        icon: "error",
        title: "Authentication Failed",
        text: apiErr?.message || "Invalid credentials",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form id="loginForm" onSubmit={handleSubmit}>
      <div className="form-floating mb-3">
        <input
          type="email"
          className="form-control"
          id="email"
          placeholder="name@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <label htmlFor="email">Email Address</label>
      </div>
      <div className="form-floating mb-4 position-relative">
        <input
          type={showPassword ? "text" : "password"}
          className="form-control"
          id="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          style={{ paddingRight: 45 }}
        />
        <label htmlFor="password">Security Password</label>
        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setShowPassword((v) => !v)}
          style={{
            position: "absolute",
            right: 15,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.4)",
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
        </button>
      </div>

      <div className="d-flex justify-content-end mb-4" style={{ marginTop: -15 }}>
        <a
          href="/admin/AccountRecovery"
          style={{ color: "var(--primary-gold)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500, opacity: 0.8 }}
        >
          Forgot Password?
        </a>
      </div>

      <button type="submit" className="login-btn" id="loginBtn" disabled={loading}>
        <i className="fas fa-sign-in-alt me-2"></i> {loading ? "Authenticating..." : "Authenticate"}
      </button>
    </form>
  );
}
