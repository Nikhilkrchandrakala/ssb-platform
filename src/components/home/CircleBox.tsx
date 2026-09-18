"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/style/Navbar.module.css";
import CircularCard from "./CircularCard";
import CustomButton from "@/components/site/CustomButton";
import HeadingTwo from "@/components/site/HeadingTwo";
import { useSiteUser } from "@/components/site/SiteUserProvider";

interface NumberMonitorData {
  officerSelection?: number;
  facultyExperience?: number;
  yearService?: number;
  totalFaculty?: number;
}

function CircleBox() {
  const [data, setData] = useState<NumberMonitorData | null>(null);
  const [loading, setLoading] = useState(true);

  const { user } = useSiteUser();

  const fetchNumberMonitors = async () => {
    try {
      const res = await fetch("/api/allNumberMonitors");
      const json: NumberMonitorData[] = await res.json();

      if (json && json.length > 0) {
        setData(json[0]); // safe
      }
    } catch (error) {
      console.error("Error fetching:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNumberMonitors();
  }, []);

  const array = [
    { number: data?.officerSelection || 0, title: "Candidates Recommended", timeDel: "2" },
    { number: data?.facultyExperience || 0, title: "Years of Proven Track Record", timeDel: "4" },
    { number: data?.yearService || 0, title: "Years of Domain Expertise", timeDel: "6" },
    { number: data?.totalFaculty || 0, title: "Specialist Faculty Members", timeDel: "8" },
  ];

  const router = useRouter();

  const handelLogin = () => {
    router.push("/SignIn");
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>;
  }

  return (
    <section className={styles.circleSection}>
      <div className={styles.circleSectionCenterCon}>
        <div className={styles.circleSectionContainer}>
          {array.map((e, index) => (
            <CircularCard key={index} index={index} number={e.number} title={e.title} timeDel={e.timeDel} />
          ))}
        </div>

        <div>
          <div className="headingOfMargin">
            <h1 style={{ fontSize: "1px", opacity: 0, position: "absolute" }}>
              Best SSB Coaching in India | Coached by Ex-SSB Assessors
            </h1>
            <HeadingTwo h1="What is" t1="SSB with ISV?" />
          </div>

          <p className={styles.titleOfSecondSection}>
            SSB with ISV (Integrated SSB Virtuosos) is India&rsquo;s best SSB mentoring institute &mdash; built and
            led by people who used to sit on the other side of the board.
          </p>

          <p className={styles.titleOfSecondSection}>
            For 5 years, we&rsquo;ve mentored candidates online: 700+ students coached, 200+ recommended into the
            Indian Armed Forces. Our mentors, Lt Cdr Nikhil Kumar Chandrakala, India&rsquo;s youngest Group Testing
            Officer since 1947, and Commodore Pankaj Singh, Ex Board President of 12 SSB, have personally assessed
            over 30,000 candidates between them.
          </p>

          <p className={styles.titleOfSecondSection}>
            We built VTX™, India&rsquo;s first patented Virtual GTO ground, because no candidate should walk onto a
            real GTO ground having never experienced one before.
          </p>

          <p className={styles.titleOfSecondSection}>
            And now, we&rsquo;re offline. SSB with ISV&rsquo;s first physical campus opens in Nagpur, 26th October
            &mdash; the same mentors, the same standard, in person.
          </p>

          <p className={styles.titleOfThirdSection}>
            <span className={styles.boxText}>
              Handholding till recommendation &nbsp;/&nbsp; Over 50% candidates recommended &nbsp;/&nbsp; Virtual GTO
              Training Experience &nbsp;/&nbsp; Repeat online classes infinite times
            </span>
          </p>

          <div className="mvk-benefits">
            <HeadingTwo
              h1="Why SSB with ISV is one of the"
              t1="best SSB coaching institutes in India?"
              style={{ fontSize: "18px", fontWeight: 500, marginBottom: "16px" }}
            />

            <ul>
              <li>Mentoring by DIPR certified former SSB officers (GTOs, IOs, Psychologists)</li>
              <li>First hand exposure to India&rsquo;s 1st virtual GTO ground</li>

              <li>GTO task practice on 250+ GTO tasks</li>
              <li>Leadership and personality development</li>
              <li>Personalized SSB interview guidance</li>
              <li>TAT, WAT, SRT, SD assessment and personalised feedback</li>

              <li>Mock personal interview and personalised feedback</li>
              <li>GTO assessment and feedback</li>
              <li>Small batch size (30 students per batch)</li>
            </ul>
          </div>

          <div style={{ marginTop: "30px" }} className="d-flex gap-4">
            {!user && <CustomButton text="Sign Up Now" onClick={handelLogin} />}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CircleBox;
