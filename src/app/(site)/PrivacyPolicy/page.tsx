import type { Metadata } from "next";
import PrivacyPolicyClient from "./PrivacyPolicyClient";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How SSB with ISV collects, uses and protects your personal data when you use our website, ONLINE courses and VTX™.",
  alternates: { canonical: "/PrivacyPolicy" },
  openGraph: {
    title: "Privacy Policy",
    description: "How SSB with ISV collects, uses and protects your personal data when you use our website, ONLINE courses and VTX™.",
    url: "/PrivacyPolicy",
  },
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />;
}
