import type { Metadata } from "next";
import RefundCancellationClient from "./RefundCancellationClient";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | SSB with ISV",
  description: "Refund and cancellation policy for SSB with ISV's courses, mentoring sessions and batches.",
  alternates: {
    canonical: "https://ssbwithisv.in/RefundCancellation",
  },
};

export default function RefundCancellationPage() {
  return <RefundCancellationClient />;
}
