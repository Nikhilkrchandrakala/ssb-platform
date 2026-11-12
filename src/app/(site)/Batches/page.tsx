import type { Metadata } from "next";
import BatchesView from "./BatchesView";

export const metadata: Metadata = {
  title: "Online SSB Batches & Schedule | SSB with ISV",
  description: "See upcoming SSB batch dates for live ONLINE mentoring. Check seats, schedule and enrolment details before you register.",
  alternates: { canonical: "/Batches" },
  openGraph: {
    title: "Online SSB Batches & Schedule | SSB with ISV",
    description: "See upcoming SSB batch dates for live ONLINE mentoring. Check seats, schedule and enrolment details before you register.",
    url: "/Batches",
  },
};

export default function BatchesPage() {
  return <BatchesView />;
}
