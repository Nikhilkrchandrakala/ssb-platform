import type { Metadata } from "next";
import SuccessView from "./SuccessView";

export const metadata: Metadata = {
  title: "Payment Successful | SSB with ISV",
  robots: { index: false, follow: false },
};

export default function SuccessPage() {
  return <SuccessView />;
}
