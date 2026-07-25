import type { Metadata } from "next";
import CustomHeader from "@/components/site/CustomHeader";
import Faq from "@/components/site/Faq";
import { faqData } from "@/util/data";
import Methodology from "./Methodology";
import DaySchedule from "./DaySchedule";
import TipsToExcel from "./TipsToExcel";
import SelectionMap from "./SelectionMap";

export const metadata: Metadata = {
  title: "What is Services Selection Board? | Complete SSB Selection Explained",
  description:
    "Learn how the Services Selection Board (SSB) interview works, including screening tests, psychology assessments, GTO tasks, personal interview and officer-like qualities evaluation.",
  alternates: {
    canonical: "https://ssbwithisv.in/aboutSSB",
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
      name: "About SSB",
      item: "https://ssbwithisv.in/aboutSSB",
    },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the best way to prepare for SSB interview?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The best way to prepare for the SSB interview is to understand the assessment process, work on officer-like qualities, practice psychology tests such as TAT, WAT and SRT, and participate in group discussions and leadership activities.",
      },
    },
    {
      "@type": "Question",
      name: "How to choose the best SSB coaching institute for me?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Choose an institute that provides guidance from DIPR qualified experienced ex-SSB assessors and offers structured preparation for psych tests, GTO tasks and personal interviews.",
      },
    },
    {
      "@type": "Question",
      name: "What are the psychology tests in SSB?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The psychology tests in SSB include Thematic Apperception Test (TAT), Word Association Test (WAT), Situation Reaction Test (SRT) and Self Description Test (SDT).",
      },
    },
  ],
};

const headerData = {
  heading: " What is the Services Selection Board (SSB)?",
  text: `The Services Selection Board (SSB) is the official selection system used by the Indian Armed Forces to identify candidates with the personality, leadership potential, and officer-like qualities required to become commissioned officers. Unlike traditional examinations that primarily evaluate academic knowledge, the SSB interview is designed to assess a candidate’s behaviour, decision-making ability, emotional intelligence, communication skills, and leadership potential.
Through a structured five-day evaluation process, candidates are observed across psychological tests, group tasks, and personal interviews. The aim is to identify individuals who demonstrate the mindset, responsibility, and character required to lead troops and operate effectively in challenging environments.`,
  banner: "/assets/website/Whatisssb_banner.webp",
};

export default function SsbPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <CustomHeader heading={headerData.heading} text={headerData.text} banner={headerData.banner} />

      <section className="container sectionspace80">
        <div className="row justify-content-center">
          {/* ===== PHILOSOPHY ===== */}
          <div className="sct-title mb-4 text-center">
            <h2>Philosophy of SSB</h2>
          </div>

          <p className="ssb-philosophy-text">
            The SSB selection system is based on behavioural assessment rather than theoretical testing. The
            philosophy behind the process is that leadership potential cannot be accurately measured through
            written examinations alone.
          </p>

          <p className="ssb-philosophy-text">
            Instead, the SSB evaluates how candidates think, act, communicate, and interact with others in different
            situations under pressure. By observing candidates across multiple activities, the board gains a
            comprehensive understanding of their personality and suitability for military leadership.
          </p>

          <p className="ssb-philosophy-text">
            The selection process focuses on identifying individuals who demonstrate initiative, responsibility,
            cooperation, determination, and clarity of thought.
          </p>

          {/* ===== FIVE DAY PROCESS ===== */}
          <div className="sct-title mb-4 text-center mt-5">
            <h2>The Five-Day SSB Interview Process</h2>
          </div>

          <p className="ssb-philosophy-text">
            The SSB interview process typically spans five days, during which candidates are assessed through
            multiple evaluation methods. Each stage is designed to observe different aspects of a candidate’s
            personality and behaviour.
          </p>

          <p className="ssb-philosophy-text">Candidates are evaluated by three independent assessors:</p>

          <ul className="ssb-philosophy-list ">
            <li>Psychologist</li>
            <li>Group Testing Officer (GTO)</li>
            <li>Interviewing Officer (IO)</li>
          </ul>

          <p className="ssb-philosophy-text">
            This three-dimensional evaluation system ensures that a candidate’s personality is assessed from
            different perspectives before the final recommendation is made.
          </p>

          {/* ===== IMPORTANCE ===== */}
          <div className="sct-title mb-4 text-center mt-5">
            <h2>Why does understanding the SSB process matter?</h2>
          </div>

          <p className="ssb-philosophy-text">
            Many candidates approach the SSB interview without fully understanding how the selection process works.
            This often leads to confusion during group discussions, psychological tests, and interviews.
          </p>

          <p className="ssb-philosophy-text">
            Preparation for the SSB interview is not about memorizing answers or following shortcuts. Instead, it
            involves developing self-awareness, leadership behaviour, communication skills, and the officer-like
            qualities expected from future leaders of the Indian Armed Forces.
          </p>
        </div>
      </section>

      <Methodology />
      <DaySchedule />
      <TipsToExcel />
      <SelectionMap />

      <Faq data={faqData} />
    </>
  );
}
