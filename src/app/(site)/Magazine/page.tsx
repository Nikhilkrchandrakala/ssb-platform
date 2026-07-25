import type { Metadata } from "next";
import MagazineView from "./MagazineView";

export const metadata: Metadata = {
  title: "SSB Current Affairs & Insights | Defence Aspirants Magazine",
  description:
    "Roger That Magazine brings curated global news, defence insights, and current affairs to help SSB aspirants build knowledge, perspective, and confidence for group discussions and interviews.",
  alternates: {
    canonical: "https://ssbwithisv.in/magazine",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://ssbwithisv.in/" },
    { "@type": "ListItem", position: 2, name: "Magazine", item: "https://ssbwithisv.in/magazine" },
  ],
};

export default function MagazinePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <MagazineView />
    </>
  );
}
