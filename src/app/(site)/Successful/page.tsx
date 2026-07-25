import type { Metadata } from "next";
import "@/style/custom-theme.css";

export const metadata: Metadata = {
  title: "Account Recovered | SSB with ISV",
};

export default function Successful() {
  return (
    <div>
      <div className="thm-content-layer">
        <div className="thm-content-bg"></div>

        <div className="container position-relative">
          <h1 className="thm-big-title">Account Recovery</h1>
          <div className="row col-xl-7 g-4 g-md-2 col-lg-9 mx-auto justify-content-center">
            <div className="success-check-icon">
              <img src="/assets/Vector.png" alt="Check mark" />
            </div>
            <div className="success-check-text">
              Your account has been successfully recovered!
              <br />
              Sign in for better learning Xperience .
            </div>
          </div>

          <span className="thm-glow"></span>
        </div>
      </div>
    </div>
  );
}
