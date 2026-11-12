import type { Metadata } from "next";
import OfflineBatchesView from "./OfflineBatchesView";

export const metadata: Metadata = {
  title: "Offline SSB Batches — Coming Soon | SSB with ISV",
  description: "Offline SSB training batches are coming soon. Explore our live online SSB mentoring batches and VTX™ virtual GTO ground.",
  alternates: { canonical: "/OfflineBatches" },
  openGraph: {
    title: "Offline SSB Batches — Coming Soon | SSB with ISV",
    description: "Offline SSB training batches are coming soon. Explore our live online SSB mentoring batches and VTX™ virtual GTO ground.",
    url: "/OfflineBatches",
  },
};

export default function OfflineBatchesPage() {
  return <OfflineBatchesView />;
}
