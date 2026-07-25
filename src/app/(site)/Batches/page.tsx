import type { Metadata } from "next";
import BatchesView from "./BatchesView";

export const metadata: Metadata = {
  title: "Ongoing Online SSB Batches | SSB with ISV",
  description:
    "Browse ongoing online SSB batches and book your seat for the 10-day SSB Hackathon or individual modules — Intro to SSB & PPDT, Psych Test Prep, Interview Theory and Group Testing on VTX.",
  alternates: {
    canonical: "https://ssbwithisv.in/Batches",
  },
};

export default function BatchesPage() {
  return <BatchesView />;
}
