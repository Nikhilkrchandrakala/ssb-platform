import type { Metadata } from "next";
import PrivacyPolicyClient from "./PrivacyPolicyClient";

export const metadata: Metadata = {
  title: "Privacy Policy | SSB with ISV",
  description:
    "Read the Privacy Policy of SSB with ISV — covering data collection, usage, user rights and compliance with the IT Act 2000, SPDI Rules 2011, and DPDP Act 2023.",
  alternates: {
    canonical: "https://ssbwithisv.in/PrivacyPolicy",
  },
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />;
}
