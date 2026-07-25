"use client";

import { useRouter } from "next/navigation";
import { IoMdArrowBack } from "react-icons/io";
import "@/style/PrivacyPolicy.css";

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <section className="privacy-root">
      <div onClick={() => router.back()} className="BackBtn">
        <IoMdArrowBack />
      </div>

      <div className="privacy-container">
        <h1 className="privacy-title">Privacy Policy</h1>

        <p className="privacy-meta">
          (Compliant with IT Act, 2000 | SPDI Rules, 2011 | DPDP Act, 2023)
          <br />
          {/* Explicit locale avoids a hydration mismatch: this is Server-rendered, and
              `toLocaleDateString()` with no locale arg follows the runtime's default
              locale — Node's default and the browser's can format the same date
              differently (e.g. "22/7/2026" vs "22/07/2026"), which React flags as a
              server/client text mismatch. Ported as-is from legacy, which only ever
              ran client-side so this never surfaced there. */}
          <strong>Last Updated:</strong> {new Date().toLocaleDateString("en-GB")}
        </p>

        <div className="privacy-content">
          <p>
            PLEASE READ THIS PRIVACY STATEMENT CAREFULLY. BY CLICKING “I AGREE” OR BY CONTINUING TO USE THE WEBSITE,
            PROVIDING US PERSONAL INFORMATION, YOU CONSENT TO OUR USE OF YOUR PERSONAL INFORMATION IN ACCORDANCE WITH
            THE TERMS OF THIS PRIVACY STATEMENT. IF YOU DO NOT AGREE TO THIS PRIVACY STATEMENT, YOU MAY WITHDRAW YOUR
            CONSENT OR ALTERNATIVELY CHOOSE NOT TO PROVIDE YOUR PERSONAL INFORMATION ON THE WEBSITE. SUCH AN
            INTIMATION TO WITHDRAW YOUR CONSENT CAN BE PROVIDED BY EMAIL TO *info@ssbwithisv.in*. IF YOU ARE
            ACCESSING THE WEBSITE ON BEHALF OF A THIRD PARTY, YOU REPRESENT THAT YOU HAVE THE AUTHORITY TO BIND SUCH
            THIRD-PARTY TO THE TERMS AND CONDITIONS OF THIS PRIVACY STATEMENT AND, IN SUCH AN EVENT YOUR USE OF THE
            WEBSITE SHALL REFER TO USE BY SUCH THIRD PARTY. IF YOU DO NOT HAVE SUCH AN AUTHORITY (TO PROVIDE ANY
            PERSONAL INFORMATION OF A THIRD PARTY) OR DO NOT AGREE TO THE TERMS OF THIS PRIVACY STATEMENT, THEN YOU
            SHOULD REFRAIN FROM USING THE WEBSITE.
          </p>

          <p>
            SSB with ISV (“we”, “us”, “our”) is committed to protecting the privacy and personal data of all users,
            aspirants, students, parents, and visitors (“you”, “your”) who access or use our website, services,
            courses, content, and communication channels.
          </p>

          <p>This Privacy Policy is issued in accordance with:</p>
          <ul>
            <li>The Information Technology Act, 2000</li>
            <li>The Information Technology (SPDI) Rules, 2011</li>
            <li>The Digital Personal Data Protection Act, 2023 (DPDP Act)</li>
          </ul>

          <p>
            By accessing or using our website or services, you consent to the collection, use, processing, storage,
            and disclosure of your personal data as described below.
          </p>

          <h2>1. Information We Collect</h2>

          <h3>a) Personal Data</h3>
          <ul>
            <li>Name</li>
            <li>Email address</li>
            <li>Mobile / WhatsApp number</li>
            <li>Date of birth</li>
            <li>Educational details</li>
            <li>SSB entry details (eligibility, attempts, board details)</li>
            <li>Payment and transaction details (processed via third-party gateways)</li>
            <li>Communication records (calls, emails, WhatsApp messages)</li>
          </ul>

          <h3>b) Automatically Collected Data</h3>
          <ul>
            <li>IP address</li>
            <li>Device and browser details</li>
            <li>Website navigation behaviour</li>
            <li>Cookies and tracking data</li>
          </ul>

          <h3>c) Data from Third-Party Sources</h3>
          <ul>
            <li>Google Ads, Meta (Instagram/Facebook) lead forms</li>
            <li>Website enquiry forms</li>
            <li>Magazine downloads, webinars, registrations, referrals</li>
          </ul>

          <h2>2. Purpose of Data Collection</h2>
          <ul>
            <li>Responding to enquiries and counselling</li>
            <li>Admissions, onboarding, scheduling</li>
            <li>Payment processing and record keeping</li>
            <li>Analytics and service improvement</li>
            <li>Marketing communication (subject to consent)</li>
            <li>Legal and regulatory compliance</li>
          </ul>

          <h2>3. Legal Basis for Processing (DPDP Act, 2023)</h2>
          <ul>
            <li>User consent</li>
            <li>Legitimate educational use</li>
            <li>Legal obligations</li>
          </ul>

          <h2>4. Cookies and Tracking</h2>
          <p>
            Cookies are used for functionality, analytics, and advertising attribution. You may disable cookies via
            browser settings.
          </p>

          <h2>5. Data Sharing & Disclosure</h2>
          <p>
            We do not sell personal data. Data may be shared with internal staff, trusted service providers, or legal
            authorities if required.
          </p>

          <h2>6. Data Security</h2>
          <p>
            Reasonable security practices are implemented including access controls, encrypted platforms, and secure
            servers.
          </p>

          <h2>7. Data Retention</h2>
          <p>
            Data is retained only as long as necessary for services, compliance, or dispute resolution.
          </p>

          <h2>8. Communication & Marketing</h2>
          <p>
            Users may opt out of promotional communication at any time. Transactional messages may continue.
          </p>

          <h2>9. Testimonials & Media</h2>
          <p>Testimonials are used only with explicit consent, which may be withdrawn.</p>

          <h2>10. Children’s Data</h2>
          <p>For users under 18, parental or guardian consent is required.</p>

          <h2>11. User Rights</h2>
          <ul>
            <li>Access personal data</li>
            <li>Request correction or erasure</li>
            <li>Withdraw consent</li>
            <li>Register grievances</li>
          </ul>

          <h2>12. Policy Updates</h2>
          <p>This policy may be updated periodically. Continued use implies acceptance.</p>
        </div>
      </div>
    </section>
  );
}
