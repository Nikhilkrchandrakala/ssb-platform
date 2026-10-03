import type { Metadata } from "next";
import OfficerLikeQualitiesClient from "./OfficerLikeQualitiesClient";

export const metadata: Metadata = {
  title: "15 Officer Like Qualities (OLQs) Explained | SSB Selection Matrix | SSB with ISV",
  description:
    "Understand all 15 Officer Like Qualities (OLQs) assessed at the Services Selection Board. Learn how EI, RA, OA, Initiative, Courage, Stamina and more are evaluated across 4 personality factors by SSB assessors.",
  alternates: {
    canonical: "https://ssbwithisv.in/OfficerLikeQualities",
  },
  openGraph: {
    title: "15 Officer Like Qualities (OLQs) Explained | SSB with ISV",
    description:
      "Understand all 15 Officer Like Qualities (OLQs) assessed at the Services Selection Board , mapped across 4 personality factors by DIPR certified ex-SSB assessors.",
    url: "https://ssbwithisv.in/OfficerLikeQualities",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "15 Officer Like Qualities (OLQs) Explained | SSB with ISV",
    description:
      "Understand all 15 Officer Like Qualities (OLQs) assessed at the Services Selection Board , mapped across 4 personality factors.",
  },
};

export default function OfficerLikeQualitiesPage() {
  return <OfficerLikeQualitiesClient />;
}
