import type { Metadata } from "next";
import CustomHeader from "@/components/site/CustomHeader";
import EnquiryForm from "@/components/site/EnquiryForm";
import Faq from "@/components/site/Faq";
import { hallOfFameFaqData } from "@/util/data";
import CandidatesGrid from "./CandidatesGrid";

export const metadata: Metadata = {
  title: "Hall of Fame | SSB With ISV",
  description:
    "Explore success stories of candidates recommended by the Services Selection Board after mentoring with SSB with ISV. Real journeys of defence aspirants who demonstrated officer-like qualities and leadership.",
  alternates: {
    canonical: "https://ssbwithisv.in/HalfOfFame",
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
      name: "Hall of Fame",
      item: "https://ssbwithisv.in/HalfOfFame",
    },
  ],
};

const headerData = {
  heading: "Hall of Fame",
  text: `At SSB with ISV, we celebrate candidates who didn’t just prepare, they evolved...`,
  banner: "/assets/website/halloffame_banner.webp",
  color2: true,
};

export default function HalfOfFamePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <CustomHeader heading={headerData.heading} text={headerData.text} banner={headerData.banner} color2={headerData.color2} />

      <section className="GTO-what-is-not-section sectionspace80">
        <div className="container">
          <p className="hall-intro-text">
            The SSB interview is one of the most demanding leadership selection systems, evaluating a candidate’s
            personality, decision-making ability, teamwork, communication, and officer-like qualities through a
            structured five-day assessment process.
          </p>

          <p className="hall-intro-text">
            Candidates featured in this Hall of Fame have demonstrated the behavioural traits and leadership
            potential expected from officers in the Armed Forces. Their success stories reflect the importance of
            self-awareness, preparation, and consistent effort during SSB interview preparation.
          </p>

          <p className="hall-intro-text">
            Through structured mentoring, personality development training, and guidance on psychology tests, GTO
            tasks, and personal interview preparation, these aspirants prepared themselves to face the SSB selection
            process with clarity and confidence.
          </p>

          <p className="hall-intro-text">
            The Hall of Fame serves as an inspiration for future candidates preparing for NDA, CDS, AFCAT, and other
            defence entry schemes, showing that dedication and authentic preparation can lead to success in the SSB
            interview.
          </p>
        </div>

        <div className="container what-is-not-text-box px-0 mt-5">
          <div className="row g-0">
            <div className="col-lg-12 px-0">
              <div style={{ padding: "0" }} className="what-is-not-text">
                <div className="sct-title-section-gtx ">
                  <h1 className="sct-title_Sec_gtx ">
                    <span className="title-gtx shimmerText_sec">
                      करम वही करो जो करना ही फल लगे, क्युकी करम ही धर्म ।
                    </span>
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CandidatesGrid />

      <Faq data={hallOfFameFaqData} />
      <EnquiryForm />
    </>
  );
}
