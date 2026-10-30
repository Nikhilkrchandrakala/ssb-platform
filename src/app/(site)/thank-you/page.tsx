import type { Metadata } from "next";
import CoachingThankYouView from "@/components/site/CoachingThankYouView";

export const metadata: Metadata = {
  title: "Thank You | SSB with ISV",
  description: "Our team has received your details and will review your submission. One of our representatives will get in touch with you shortly.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GeneralThankYouPage() {
  return <CoachingThankYouView mode="online" />;
}
