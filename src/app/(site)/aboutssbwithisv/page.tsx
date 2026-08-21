import type { Metadata } from "next";
import CustomHeader from "@/components/site/CustomHeader";
import EnquiryForm from "@/components/site/EnquiryForm";
import styles from "@/style/RogerThat.module.css";
import SwiperComponents from "./SwiperComponents";
import TeamCarousel from "./TeamCarousel";

export const metadata: Metadata = {
  title: "About SSB with ISV | Veteran-Led SSB Coaching in India",
  description:
    "Learn about SSB with ISV, a mentoring platform focused on personality development, officer-like qualities, and structured preparation for the Services Selection Board (SSB) interview, led by defence veterans and seasoned assessors.",
  alternates: {
    canonical: "https://ssbwithisv.in/aboutssbwithisv",
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
      name: "About Us",
      item: "https://ssbwithisv.in/aboutssbwithisv",
    },
  ],
};

const headerData = {
  text: "CS Joint Services Academy operates under the brand name Integrated SSB Virtuosos. SSB with ISV is an online SSB mentoring platform dedicated to help defence aspirants understand and prepare for the Services Selection Board/ Airforce Selection Board through authentic guidance, leadership development, and behavioural insights. What makes SSB with ISV different from conventional coaching institutes is that the mentoring is delivered by DIPR certified ex-SSB assessors who have had direct experience with the SSB selection system itself. Candidates receive SSB coaching by an Ex Group Testing Officer (GTO), an Ex Interviewing Officer (IO) and Ex Psychologist (Psych) along with guidance from former regular armed forces officers (veterans), providing insights that go far beyond the theoretical preparation. This unique perspective helps aspirants understand how candidates are evaluated during the SSB interview and how officer-like-qualities are observed in real situations.",
  banner: "/assets/website/about_us_banner.webp",
  heading: "Integrated SSB Virtuosos",
};

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <CustomHeader heading={headerData.heading} text={headerData.text} banner={headerData.banner} />

      <SwiperComponents />

      <TeamCarousel />

      <section className={`container sectionspace80 ${styles.aboutIntro}`}>
        <div className="row justify-content-center">
          <div className="mvk-benefits">
            <h3> Learning the SSB process from those who have assessed it</h3>

            <p>
              The Services Selection Board interview is one of the most comprehensive leadership selection systems
              used anywhere in the world. The process evaluates personality traits such as decision-making ability,
              initiative, cooperation, emotional stability, and leadership potential.
            </p>

            <p className={styles.aboutIntroText}>
              At SSB with ISV, candidates learn the SSB process from the perspective of of ex-SSB assessors rather
              than from guesswork or second-hand coaching methods. Through mentoring by an ex-GTO, an ex-IO and an
              ex-Psychologist and experienced armed forces professionals, aspirants gain a deeper understanding of:
            </p>

            <ul>
              <li>How psychologists interpret responses in psychological tests</li>
              <li>How GTOs observe behaviour during group tasks</li>
              <li>How interviewing officers evaluate personality and motivation</li>
              <li>How consistency of behaviour influences the final recommendation</li>
            </ul>

            <p style={{ marginTop: "20px" }}>
              This assessor-led guidance helps candidates approach the SSB interview with clarity and authenticity.
            </p>
          </div>

          <div className="mvk-benefits">
            <h3>A Unique Advantage: The Virtual Training Xperience (VTX™)</h3>

            <p className={styles.aboutIntroText}>
              One of the biggest challenges for many defence aspirants preparing for the SSB interview is the lack
              of exposure to the Group Testing Officer (GTO) ground. To bridge this gap, SSB with ISV has developed
              the Virtual Training Xperience (VTX™) - a one-of-a-kind platform that provides aspirants with a
              virtual representation of the SSB/ AFSB GTO ground and task environment from any part of the globe.
              Through VTX™ , candidates can:
            </p>

            <ul>
              <li>Understand how GTO tasks (PGT, HGT, CT, FGT) are structured and conducted</li>
              <li>Visualize obstacle layouts and task strategies</li>
              <li>Develop clarity about group planning exercises and group discussions</li>
              <li>Experience the logic behind different group testing activities</li>
              <li>Understand group effectiveness, team dynamics, group movement and group theory</li>
            </ul>

            <p className={styles.aboutIntroText}>
              This innovative platform helps candidates gain exposure to the GTO task environment even before
              appearing for the actual SSB interview, making it a powerful tool for SSB preparation.
            </p>
          </div>

          <div className="mvk-benefits">
            <h3>Our Philosophy: Manasa, Vacha, Karmana</h3>

            <p className={styles.aboutIntroText}>
              The mentoring philosophy at SSB with ISV is rooted in the concept of Manasa, Vacha, Karmana — the
              alignment of thought, speech, and action. In the context of the SSB interview, this principle reflects
              the importance of authentic behaviour and internal consistency. Candidates who demonstrate alignment
              between what they think, what they say, and how they act are more likely to display the natural
              leadership traits expected from officers in the Armed Forces. Rather than teaching scripted responses
              or shortcuts, SSB with ISV focuses on helping aspirants develop self-awareness, clarity of thought,
              and confidence, enabling them to approach the SSB interview with authenticity.
            </p>
          </div>

          <div className="mvk-benefits">
            <h3>Understanding Officer Like Qualities</h3>

            <p className={styles.aboutIntroText}>
              The SSB interview is designed to identify individuals who demonstrate Officer Like Qualities (OLQs) —
              the leadership attributes required to serve in the Armed Forces.
            </p>
            <p className={styles.aboutIntroText}>These include qualities such as:</p>

            <ul>
              <li>Effective intelligence, Reasoning ability</li>
              <li>Social adaptability, Cooperation and Sense of responsibility</li>
              <li>Communication skills, Ability to influence the group</li>
              <li>Initiative, Self-confidence and Speed of decision</li>
              <li>Determination and Courage</li>
              <li>Emotional stability, Liveliness and Stamina</li>
            </ul>

            <p className={styles.aboutIntroText}>
              Through mentoring sessions, practical discussions, and guided exercises, candidates learn how these
              qualities are evaluated across psychological tests, GTO tasks, and personal interviews. The goal is
              not to artificially display these traits, but to develop the self awareness and behaviour that
              naturally reflect them.
            </p>
          </div>

          <div className="mvk-benefits">
            <h3>Bridging the Gap Between Preparation and Understanding</h3>

            <p className={styles.aboutIntroText}>
              Many aspirants approach the SSB interview with limited clarity about how the selection system
              actually works. SSB with ISV focuses on bridging this gap by helping candidates understand the logic
              behind the evaluation process.
            </p>

            <p className={styles.aboutIntroText}>
              Through guidance from an an ex-GTO, an ex-IO and an ex-Psychologist and experienced former armed
              forces officers (veterans), aspirants gain insight into:
            </p>

            <ul>
              <li>The philosophy behind the SSB selection system</li>
              <li>Behavioural indicators assessors observe during tasks</li>
              <li>How different tests contribute to the final recommendation</li>
              <li>The importance of consistency across psychology, GTO, and interview assessments</li>
            </ul>

            <p className={styles.aboutIntroText}>
              This understanding enables candidates to approach the interview with confidence, awareness, and
              authenticity.
            </p>
          </div>

          <div className="mvk-benefits">
            <h3>A Platform for Defence Aspirants</h3>

            <p className={styles.aboutIntroText}>
              SSB with ISV is more than a training program. It is a learning platform for defence aspirants who want
              to understand leadership, develop perspective, and build the mindset required for military service.
            </p>

            <p className={styles.aboutIntroText}>
              Through mentoring sessions, structured courses, the Virtual Training Xperience (VTX™) platform, and
              initiatives like Roger That Magazine, aspirants expand their awareness of global issues, leadership
              principles, and responsibilities of military officers.
            </p>

            <p className={styles.aboutIntroText}>
              These initiatives help candidates prepare not only for the SSB interview but also for their larger
              journey as future leadership in the Indian Armed Forces.
            </p>
          </div>

          <div className="mvk-benefits">
            <h3>Preparing Future Officers</h3>

            <p className={styles.aboutIntroText}>
              The objective of SSB with ISV is not simply to help candidates clear the SSB interview, but to
              develop the qualities, mindset, and leadership awareness expected from future officers in the Indian
              Armed Forces.
            </p>

            <p className={styles.aboutIntroText}>
              By combining assessor-led mentoring, armed forces experience, and innovative platforms like VTX™,
              aspirants gain a deeper understanding of the SSB selection process and behavioural expectations.
            </p>

            <p className={styles.aboutIntroText}>
              Preparing for SSB is not about shortcuts — it is about developing character and leadership qualities
              that define an officer.
            </p>
          </div>
        </div>
      </section>

      <EnquiryForm />
    </>
  );
}
