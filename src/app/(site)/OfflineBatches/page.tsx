import type { Metadata } from "next";
import OfflineBatchesView from "./OfflineBatchesView";

export const metadata: Metadata = {
  title: "Offline SSB Batches | SSB with ISV",
  description:
    "Register for an in-person SSB training batch at our center. Pay a ₹5,000 registration fee online — the balance is settled at the center.",
  alternates: {
    canonical: "https://ssbwithisv.in/OfflineBatches",
  },
};

export default function OfflineBatchesPage() {
  return <OfflineBatchesView />;
}
