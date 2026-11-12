import type { Metadata } from "next";
import RefundCancellationClient from "./RefundCancellationClient";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "Refund and cancellation terms for SSB with ISV ONLINE courses and VTX™ access. Read before you enrol.",
  alternates: { canonical: "/RefundCancellation" },
  openGraph: {
    title: "Refund & Cancellation Policy",
    description: "Refund and cancellation terms for SSB with ISV ONLINE courses and VTX™ access. Read before you enrol.",
    url: "/RefundCancellation",
  },
};

export default function RefundCancellationPage() {
  return <RefundCancellationClient />;
}
