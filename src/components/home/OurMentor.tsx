import styles from "@/style/OurMentor.module.css";
import { mentorsData } from "@/util/data";
import HeadingTwo from "@/components/site/HeadingTwo";

const OurMentor = () => {
  return (
    <section className={styles.mentorsSection}>
      <div className="">
        <div className={styles.headingContainer}>
          <HeadingTwo h1="Our" t1="mentors" />
          <div className={styles.headingContainerImg}>
            <img src="/assets/Group16.png" alt="Decoration" />
          </div>
        </div>

        <div className={styles.cardsWrapper}>
          {mentorsData.map((mentor) => (
            <div key={mentor.id} className={styles.mentorCard}>
              <div className={styles.imageWrapper}>
                <div className={styles.imageMask}>
                  <img
                    src={mentor.image}
                    alt={`${mentor.name} - ${mentor.role} - SSB with ISV`}
                    className={styles.mentorImage}
                  />
                </div>
              </div>

              <p className={styles.role}>{mentor.role}</p>
              <h2 className={styles.name}>{mentor.name}</h2>

              <p className={styles.description}>
                {mentor.description.map((line, i) => (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                ))}
              </p>

              <div className="d-flex gap-3">
                {mentor.instagram && (
                  <a href={mentor.instagram} target="_blank" rel="noopener noreferrer" className="bottom-contact-box">
                    <i className="fa fa-instagram"></i>
                  </a>
                )}

                {mentor.linkedin && (
                  <a href={mentor.linkedin} target="_blank" rel="noopener noreferrer" className="bottom-contact-box">
                    <i className="fa fa-linkedin"></i>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OurMentor;
