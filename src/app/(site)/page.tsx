import type { Metadata } from "next";
import Navbar from "@/components/site/Navbar";
import Faq from "@/components/site/Faq";
import { faqDataHome } from "@/util/data";
import CircleBox from "@/components/home/CircleBox";
import OurMentor from "@/components/home/OurMentor";
import Philosophy from "@/components/home/Philosophy";
import OurCourses from "@/components/home/OurCourses";
import UniquePedagogy from "@/components/home/UniquePedagogy";
import Resources from "@/components/home/Resources";
import RogerThat from "@/components/home/RogerThat";
import AllYouNeed from "@/components/home/AllYouNeed";
import From from "@/components/home/From";
import ReferralCapture from "@/components/home/ReferralCapture";
import AnnouncementStrip from "@/components/home/AnnouncementStrip";

const TITLE = "Best SSB Coaching in India | Online SSB Training by Ex-GTO | SSB with ISV";
const DESCRIPTION =
  "Prepare for the Services Selection Board (SSB) with India’s leading SSB coaching institute. Learn how to crack SSB interviews, psychology tests, GTO tasks and leadership assessments through expert mentoring by DIPR certified former SSB assessors";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "https://ssbwithisv.in/",
  },
};

const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://ssbwithisv.in/#website",
      url: "https://ssbwithisv.in/",
      name: "SSB with ISV",
      description:
        "SSB with ISV provides expert Services Selection Board (SSB) coaching, mentoring and interview preparation for Indian Army, Navy and Air Force aspirants.",
      publisher: {
        "@id": "https://ssbwithisv.in/#organization",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: "https://ssbwithisv.in/?s={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://ssbwithisv.in/#organization",
      name: "SSB with ISV",
      url: "https://ssbwithisv.in/",
      logo: {
        "@type": "ImageObject",
        url: "https://ssbwithisv.in/assets/logo/ISV.webp",
      },
      sameAs: [
        "https://www.instagram.com/ssbwithisv/",
        "https://www.facebook.com/ssbwithisv/",
        "https://www.linkedin.com/company/ssbwithisv",
      ],
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: "+91-8420422821",
          contactType: "customer support",
          areaServed: "IN",
          availableLanguage: ["English", "Hindi"],
        },
      ],
    },
    {
      "@type": "EducationalOrganization",
      "@id": "https://ssbwithisv.in/#educationalorganization",
      name: "SSB with ISV",
      url: "https://ssbwithisv.in/",
      description:
        "A professional SSB coaching institute offering structured courses, mock interviews and mentoring by experienced assessors.",
      parentOrganization: {
        "@id": "https://ssbwithisv.in/#organization",
      },
    },
    {
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
            text: "Choose an institute that provides guidance from DIPR qualified experienced ex-SSB assessors and offers structured preparation for psych tests, GTO tasks and personal interviews focused on deepening self awareness and enhancing leadership skills.",
          },
        },
        {
          "@type": "Question",
          name: "Can SSB be cleared without coaching?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, it is very much possible to clear SSB/ AFSB without coaching. One must have a high degree of practical intelligence, deep self insight, good reading habits and a decent physical fitness and mental robustness boosting regime.",
          },
        },
        {
          "@type": "Question",
          name: "What are the psychology tests in SSB?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The psychology tests in SSB include Thematic Apperception Test (TAT), Word Association Test (WAT), Situation Reaction Test (SRT) and Self Description Test (SDT). These tests evaluate the candidate’s thought process and personality traits.",
          },
        },
        {
          "@type": "Question",
          name: "How long does SSB preparation take?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "SSB preparation time varies for each candidate, but generally a focused preparation period of 1 to 3 months is considered sufficient to understand the process and develop the required officer-like qualities.",
          },
        },
        {
          "@type": "Question",
          name: "Is virtual training sufficient for cracking SSB?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, virtual training can be effective when it includes structured mentoring, psychology test practice, interview guidance and group task simulations that help candidates understand the SSB assessment process.",
          },
        },
        {
          "@type": "Question",
          name: "Does SSB with ISV offer offline coaching?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. SSB with ISV now offers a 12-day offline batch at our Nagpur campus, in addition to our online programmes - both mentored by the same faculty, including Lt Cdr Nikhil Kumar Chandrakala and Commodore Pankaj Singh.",
          },
        },
        {
          "@type": "Question",
          name: "Should I choose online or offline SSB coaching?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Offline training offers full immersion with in-person feedback and live GTO tasks, ideal if you can commit 12 days on campus. Online offers flexibility with the same mentors and full VTX access. Both follow the identical 12-day structure and standard.",
          },
        },
      ],
    },
  ],
};

const navbarData = {
  video: {
    src: "/assets/video/BannerVideo.mp4",
    type: "video/mp4",
  },
  logo: "/assets/logo/ISV.webp",
  subtitle: "CRAFTING THE FUTURE OF",
  title: "Indian Military",
  title1: "Leadership",
  subtitleTwo: "Integrated SSB Virtuosos",
  text: "Now offline in Nagpur. DIPR certified ex-SSB assessors - online and in person.",
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }} />

      <ReferralCapture />

      <Navbar
        video={navbarData.video}
        subtitle={navbarData.subtitle}
        title={navbarData.title}
        title1={navbarData.title1}
        subtitleTwo={navbarData.subtitleTwo}
        text={navbarData.text}
        announcement={<AnnouncementStrip />}
      />
      <CircleBox />

      <OurMentor />
      <Philosophy />
      <OurCourses />
      <UniquePedagogy />
      <Resources />
      <RogerThat />
      <AllYouNeed />
      <Faq data={faqDataHome} />
      <From />
    </>
  );
}
