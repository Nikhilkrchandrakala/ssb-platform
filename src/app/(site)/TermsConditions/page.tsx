import type { Metadata } from "next";
import "@/style/TermsConditions.css";

export const metadata: Metadata = {
  title: "Terms & Conditions | SSB with ISV",
  description: "Terms & Conditions governing use of SSB with ISV's website, courses and mentoring services.",
  alternates: {
    canonical: "https://ssbwithisv.in/TermsConditions",
  },
};

export default function TermsConditions() {
  return (
    <section className="terms-root">
      <div className="terms-container">
        <h1 className="terms-title">Terms & Conditions</h1>

        <p className="terms-meta">
          <strong>Effective Date:</strong> {new Date().toLocaleDateString("en-GB")}
        </p>

        <div className="terms-content">
          <p>
            By accessing <strong>www.ssbwithisv.in</strong> or enrolling in any course or service, you agree to the
            following Terms & Conditions.
          </p>

          <h2>1. Nature of Services</h2>
          <p>
            SSB with ISV provides mentoring, counselling, and training services for SSB preparation. We do not
            guarantee selection, recommendation, or commission into the Armed Forces.
          </p>

          <h2>2. User Responsibility</h2>
          <p>
            Users agree to provide accurate information and use services lawfully. Misuse, impersonation, or
            misrepresentation may result in termination of access without refund.
          </p>

          <h2>3. Intellectual Property</h2>
          <p>
            All content including videos, PDFs, training material, logos, and branding is the intellectual property
            of SSB with ISV and may not be copied, distributed, or reused without prior written permission.
          </p>

          <h2>4. Payments</h2>
          <p>
            All fees must be paid in full as per the course structure. Prices are subject to change without prior
            notice.
          </p>

          <h2>5. Limitation of Liability</h2>
          <p>
            SSB with ISV shall not be liable for any indirect, incidental, or consequential damages arising from the
            use of our services.
          </p>

          <h2>6. Termination</h2>
          <p>
            We reserve the right to suspend or terminate access to services in case of violation of terms,
            misconduct, or misuse.
          </p>

          <h2>7. Governing Law</h2>
          <p>
            These Terms & Conditions are governed by the laws of India. Courts at <strong>Bengaluru, Karnataka</strong>{" "}
            shall have exclusive jurisdiction.
          </p>
        </div>
      </div>
    </section>
  );
}
