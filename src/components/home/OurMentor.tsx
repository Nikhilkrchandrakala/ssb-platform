"use client";

import { useState } from "react";
import styles from "@/style/OurMentor.module.css";
import { mentorsData } from "@/util/data";
import HeadingTwo from "@/components/site/HeadingTwo";

const OurMentor = () => {
  const [selectedMentor, setSelectedMentor] = useState<any>(null);

  const openBiodata = (e: React.MouseEvent, mentor: any) => {
    e.preventDefault();
    setSelectedMentor(mentor);
  };

  const closeBiodata = () => {
    setSelectedMentor(null);
  };

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

              <div className={styles.cardBottom}>
                {mentor.fullBiodata && (
                  <button
                    type="button"
                    onClick={(e) => openBiodata(e, mentor)}
                    className={styles.biodataBtn}
                  >
                    Biodata
                  </button>
                )}

                <div className="d-flex gap-3 justify-content-center">
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
            </div>
          ))}
        </div>
      </div>

      {/* BIODATA MODAL */}
      {selectedMentor && (
        <div className={styles.modalOverlay} onClick={closeBiodata}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={closeBiodata} aria-label="Close modal">
              <span className={styles.closeIcon}>&times;</span>
            </button>
            
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderImageWrapper}>
                <img src={selectedMentor.modalImage || selectedMentor.image} alt={selectedMentor.name} className={styles.modalHeaderImage} />
              </div>
              <div className={styles.modalHeaderInfo}>
                <span className={styles.modalHeaderRole}>{selectedMentor.role}</span>
                <h3 className={styles.modalHeaderName}>{selectedMentor.name}</h3>
              </div>
            </div>

            <div className={styles.modalBody}>
              {selectedMentor.fullBiodata.type === "structured" ? (
                <div className={styles.structuredBiodata}>
                  {selectedMentor.fullBiodata.commissionDate && (
                    <div className={styles.biodataRow}>
                      <span className={styles.biodataLabel}>Date of Commission:</span>
                      <span className={styles.biodataVal}>{selectedMentor.fullBiodata.commissionDate}</span>
                    </div>
                  )}
                  {selectedMentor.fullBiodata.retirementDate && (
                    <div className={styles.biodataRow}>
                      <span className={styles.biodataLabel}>Date of Retirement:</span>
                      <span className={styles.biodataVal}>{selectedMentor.fullBiodata.retirementDate}</span>
                    </div>
                  )}
                  {selectedMentor.fullBiodata.branch && (
                    <div className={styles.biodataRow}>
                      <span className={styles.biodataLabel}>Branch/Specialisation:</span>
                      <span className={styles.biodataVal}>{selectedMentor.fullBiodata.branch}</span>
                    </div>
                  )}
                  {selectedMentor.fullBiodata.ships && (
                    <div className={styles.biodataRow}>
                      <span className={styles.biodataLabel}>Indian Naval Ships Served:</span>
                      <span className={styles.biodataVal}>{selectedMentor.fullBiodata.ships}</span>
                    </div>
                  )}
                  {selectedMentor.fullBiodata.commandAfloat && (
                    <div className={styles.biodataRow}>
                      <span className={styles.biodataLabel}>Command Appointments Afloat:</span>
                      <span className={styles.biodataVal}>{selectedMentor.fullBiodata.commandAfloat}</span>
                    </div>
                  )}
                  {selectedMentor.fullBiodata.commandAshore && (
                    <div className={styles.biodataRow}>
                      <span className={styles.biodataLabel}>Command Appointments Ashore:</span>
                      <span className={styles.biodataVal}>{selectedMentor.fullBiodata.commandAshore}</span>
                    </div>
                  )}
                  {selectedMentor.fullBiodata.otherAppointments && (
                    <div className={styles.biodataRow}>
                      <span className={styles.biodataLabel}>Staff & Other Appointments:</span>
                      <span className={styles.biodataVal}>{selectedMentor.fullBiodata.otherAppointments}</span>
                    </div>
                  )}
                  
                  {selectedMentor.fullBiodata.education && selectedMentor.fullBiodata.education.length > 0 && (
                    <div className={styles.biodataSection}>
                      <h4 className={styles.biodataSectionTitle}>Education</h4>
                      <ul className={styles.biodataList}>
                        {selectedMentor.fullBiodata.education.map((edu: string, idx: number) => (
                          <li key={idx}>{edu}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.narrativeBiodata}>
                  {selectedMentor.fullBiodata.paragraphs.map((para: string, idx: number) => (
                    <p key={idx} className={styles.narrativePara}>{para}</p>
                  ))}
                  {selectedMentor.fullBiodata.philosophy && (
                    <blockquote className={styles.philosophyBlock}>
                      <p className={styles.philosophyQuote}>&ldquo;{selectedMentor.fullBiodata.philosophy}&rdquo;</p>
                    </blockquote>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default OurMentor;
