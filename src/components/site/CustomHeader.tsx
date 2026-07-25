"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/style/Navbar.module.css";
import { IoMenu } from "react-icons/io5";
import Sidebar from "./Sidebar";

interface CustomHeaderProps {
  heading?: React.ReactNode;
  text?: React.ReactNode;
  textTwo?: React.ReactNode;
  span?: React.ReactNode;
  textThree?: string;
  color?: boolean;
  banner?: string;
  color2?: boolean;
  headingTwo?: React.ReactNode;
  preragraph?: React.ReactNode;
  preragraphTwo?: React.ReactNode;
}

export default function CustomHeader({
  heading,
  text,
  textTwo,
  span,
  textThree,
  color,
  banner,
  color2,
  headingTwo,
  preragraph,
  preragraphTwo,
}: CustomHeaderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="breed-section" style={{ backgroundImage: `url(${banner ? banner : "/assets/img/about/about-breed.webp"})` }}>
        <div>
          <div className={styles.topBar}>
            <img src="/assets/logo/ISV.webp" alt="Logo" className={styles.logo} onClick={() => router.push("/")} />
            <IoMenu className={styles.menuIcon} onClick={() => setOpen(true)} />
          </div>
        </div>

        <Sidebar open={open} onClose={() => setOpen(false)} />

        <div className="breed-overlay"></div>

        <div className="breed-content container">
          <div className="col-12 row mx-auto">
            {color && <img src="/assets/logo/VTXlogo.png" alt="header" style={{ width: "250px" }} />}

            <div className="col-xl-12">
              {color && heading && (
                <h1 style={{ color: "var(--secondary-color)" }} className="breed-big-title">
                  {heading}
                  {span && <span className="sup-text">{span}</span>}
                </h1>
              )}
              {!color && heading && (
                <h1 className="breed-big-title">
                  {heading}
                  {span && <sup>{span}</sup>}
                </h1>
              )}
            </div>

            <div className="col-xl-8">
              {textThree && (
                <h1 className="breed-title">
                  {textThree.split("by")[0]} <br />
                  by {textThree.split("by")[1]}
                </h1>
              )}

              {text && <p className="breed-subtitle">{text}</p>}
              {textTwo && (
                <div className="breed-text">
                  <p>{textTwo}</p>
                </div>
              )}
            </div>

            {color2 && (
              <div className="col-xl-7">
                <img src="/assets/karam.webp" alt="Shape2" style={{ width: "250px" }} />
              </div>
            )}

            {headingTwo && <h1 className="breed-title mt-4">{headingTwo}</h1>}

            {preragraph && <p className="breed-subtitle">{preragraph}</p>}
            {preragraphTwo && <p className="breed-subtitle">{preragraphTwo}</p>}
          </div>
        </div>
        <div className="decor-shape1">
          <img src="/assets/img/shape/Group_11.png" alt="Shape1" />
        </div>
      </section>
    </>
  );
}
