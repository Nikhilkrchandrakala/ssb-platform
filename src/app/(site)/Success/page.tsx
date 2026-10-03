import type { Metadata } from "next";
import SuccessView from "./SuccessView";

export const metadata = {
  title: "Payment Successful",
  description: "Your payment to SSB with ISV was successful.",
  robots: { index: false, follow: false }
};

export default function SuccessPage() {
  return <SuccessView />;
}
