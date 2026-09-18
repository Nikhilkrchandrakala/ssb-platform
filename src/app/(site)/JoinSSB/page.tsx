import type { Metadata } from "next";
import JoinSSBView from "./JoinSSBView";

export const metadata: Metadata = {
  title: "Join SSB Batch | SSB with ISV",
  description: "Choose an online or offline (in-person) SSB batch to join.",
  alternates: {
    canonical: "https://ssbwithisv.in/JoinSSB",
  },
};

export default function JoinSSBPage() {
  return <JoinSSBView />;
}
