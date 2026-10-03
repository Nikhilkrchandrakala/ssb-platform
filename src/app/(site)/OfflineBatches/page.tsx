import type { Metadata } from "next";
import OfflineBatchesView from "./OfflineBatchesView";

export const metadata: Metadata = {
  title: "Nagpur SSB Camp Batches | Register for Offline Training",
  description: "Register for the next 12-day residential SSB batch in Nagpur. View dates, fees, seat availability and what to bring before you reserve your place.",
  alternates: { canonical: "/OfflineBatches" },
  openGraph: {
    title: "Nagpur SSB Camp Batches | Register for Offline Training",
    description: "Register for the next 12-day residential SSB batch in Nagpur. View dates, fees, seat availability and what to bring before you reserve your place.",
    url: "/OfflineBatches",
  },
};

export default function OfflineBatchesPage() {
  return <OfflineBatchesView />;
}
