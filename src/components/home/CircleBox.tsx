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
            India&rsquo;s first online SSB mentoring platform with a proprietary virtual training experience (VTX™).
            At SSB with ISV, we provide structured SSB coaching and interview preparation designed to help aspirants
            understand the assessment process and develop authentic leadership behaviour. Our mentoring programs
            cover psychology tests such as TAT, WAT, SRT, GTO tasks, PIQ analysis, and personal interview training.
            Led by DIPR certified ex-SSB assessors of the Indian Armed Forces, SSB with ISV comes with a promise to
            guide and prepare aspiring officers for success in the Services Selection Board.
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
