import type { Metadata } from "next";
import SoftskillBootcampView from "./SoftskillBootcampView";

export const metadata: Metadata = {
  title: "4 Weeks Soft Skills Bootcamp | Program in Confident Speech | SSB with ISV",
  description:
    "Master disciplined, confident speech with Lt. Commander Niati Hirway (Retd.). 4 weeks of structured live daily drills (9:30 AM – 10:30 AM), thought structuring, STAR format interview mastery, and public address.",
  alternates: { canonical: "/SoftskillBootcamp" },
  openGraph: {
    title: "4 Weeks Soft Skills Bootcamp | Program in Confident Speech | SSB with ISV",
    description:
      "A structured 4-week online program in disciplined, confident speech (9:30 AM – 10:30 AM) for classrooms, interviews, and the workplace. Led by Voice of the Navy, Lt. Cdr. Niati Hirway (Retd.).",
    url: "/SoftskillBootcamp",
    type: "website",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://ssbwithisv.in/",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "4 Weeks Soft Skills Bootcamp",
      item: "https://ssbwithisv.in/SoftskillBootcamp",
    },
  ],
};

export default function SoftskillBootcampPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <SoftskillBootcampView />
    </>
  );
}
