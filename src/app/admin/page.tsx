import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { ADMIN_PANEL_ROLES } from "@/server/adminAccess";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

// Ported from admin-ssbwithisv/index.html + assets/js/admin.js.
export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user && ADMIN_PANEL_ROLES.includes(user.role as string)) {
    redirect(user.role === "franchise" ? "/admin/FranchiseDashboard" : "/admin/Profile");
  }

  return (
    <div
      style={{
        background: "radial-gradient(circle at 50% 50%, #1a1a1a 0%, #050505 100%)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflowY: "auto",
        padding: 20,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          background: "radial-gradient(circle, rgba(224, 194, 20, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          zIndex: -1,
          filter: "blur(40px)",
        }}
      ></div>

      <div
        style={{
          background: "rgba(20, 20, 20, 0.6)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(224, 194, 20, 0.15)",
          padding: "50px 40px",
          borderRadius: "var(--radius-md)",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          position: "relative",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ marginBottom: 20, display: "inline-block" }}>
            <img
              src="/assets/logo/logo.png"
              alt="SSB Logo"
              style={{ height: 60, objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(224, 194, 20, 0.25))" }}
            />
          </div>
          <h2 style={{ fontWeight: 800, letterSpacing: "-0.5px", color: "#fff", marginBottom: 8 }}>Admin Gateway</h2>
          <p style={{ color: "var(--text-white)", opacity: 0.5, fontSize: "0.9rem" }}>Access the SSB secure management suite</p>
        </div>

        <AdminLoginForm />
      </div>
    </div>
  );
}
