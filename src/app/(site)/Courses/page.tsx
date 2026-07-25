import type { Metadata } from "next";
import CoursesView from "./CoursesView";

export const metadata: Metadata = {
  title: "Best SSB Coaching Courses in India | Online SSB Training Program | SSB with ISV",
  description:
    "Join India's best online SSB coaching courses taught by DIPR certified ex-SSB assessors. Covers GTO tasks, psychology tests, personal interview, OLQ development and more. 50%+ recommendation rate.",
  alternates: {
    canonical: "https://ssbwithisv.in/Courses",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://ssbwithisv.in/" },
    { "@type": "ListItem", position: 2, name: "Courses", item: "https://ssbwithisv.in/Courses" },
  ],
};

const courseSchema = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "10 days Services Selection Board Hackathon",
  description:
    "Complete SSB preparation course covering GTO tasks, psychology tests and personal interviews by DIPR certified ex-SSB assessors.",
  provider: {
    "@type": "Organization",
    name: "SSB with ISV",
    sameAs: "https://ssbwithisv.in/",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the best way to prepare for the SSB interview?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The best way to prepare for the Services Selection Board (SSB) interview is to focus on personality development, leadership behaviour, and clarity of thought rather than memorized answers.",
      },
    },
    {
      "@type": "Question",
      name: "Can SSB be cleared without coaching?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, it is possible to clear the SSB interview without formal coaching. However, structured SSB training programs help candidates understand the selection process, psychological tests, and group tasks more clearly.",
      },
    },
    {
      "@type": "Question",
      name: "What are the psychology tests conducted in the SSB interview?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The SSB interview includes several psychological tests including Thematic Apperception Test (TAT), Word Association Test (WAT), Situation Reaction Test (SRT), and Self Description Test (SDT).",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to prepare for the SSB interview?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SSB preparation timelines vary, but many candidates begin preparing 2–3 months before their SSB interview, focusing on personality development and understanding GTO tasks.",
      },
    },
  ],
};

export default function CoursesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <CoursesView />
    </>
  );
}
