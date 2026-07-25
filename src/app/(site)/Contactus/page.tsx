import type { Metadata } from "next";
import CustomHeader from "@/components/site/CustomHeader";
import EnquiryForm from "@/components/site/EnquiryForm";

export const metadata: Metadata = {
  title: "Contact SSB with ISV | SSB Coaching & Admissions",
  description:
    "Get in touch with SSB with ISV for admissions, counselling and expert guidance for SSB preparation and Armed Forces careers.",
  alternates: {
    canonical: "https://ssbwithisv.in/Contactus",
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
      name: "Contact Us",
      item: "https://ssbwithisv.in/Contactus",
    },
  ],
};

export default function ContactPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <CustomHeader
        heading="Enquire with us"
        text={`At CS Joint Services Academy, we believe every aspirant deserves personal guidance and clarity.
                Reach out to us for course details, counselling, or any queries related to SSB preparation.
                Our team is always ready to assist you on your journey to becoming an officer in the Indian Armed Forces.
                `}
        banner="/assets/website/contact_us_banner.webp"
      />

      <EnquiryForm />
    </>
  );
}
