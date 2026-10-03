import type { Metadata } from "next";
import BatchesView from "./BatchesView";

export const metadata: Metadata = {
  title: "SSB Batches & Schedule | ONLINE and Nagpur Offline",
  description: "See upcoming SSB batch dates for ONLINE mentoring and the residential camp in Nagpur. Check seats, schedule and enrolment details before you register.",
  alternates: { canonical: "/Batches" },
  openGraph: {
    title: "SSB Batches & Schedule | ONLINE and Nagpur Offline",
    description: "See upcoming SSB batch dates for ONLINE mentoring and the residential camp in Nagpur. Check seats, schedule and enrolment details before you register.",
    url: "/Batches",
  },
};

export default function BatchesPage() {
  return <BatchesView />;
}
