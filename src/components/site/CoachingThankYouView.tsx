"use client";

import { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { BiCheckCircle } from "react-icons/bi";

type ThankYouMode = "online" | "offline" | "general";

interface CoachingThankYouViewProps {
  mode?: ThankYouMode;
}

export default function CoachingThankYouView({}: CoachingThankYouViewProps = {}) {
  useEffect(() => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.55 },
        colors: ["#e3c607", "#d2a100", "#c6c5af", "#ffffff"],
      });
    } catch {
      // Non-fatal if canvas unsupported
    }
  }, []);

  const heading = "Thank You!";
  const message =
    "Our team has received your details and will review your submission. One of our representatives will get in touch with you shortly to guide you through the next steps.";

  return (
    <div
      style={{
        minHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#050507",
        color: "#ffffff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 500,
          height: 350,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(227,198,7,0.12) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      {/* Top Header Bar */}
      <header
        style={{
          padding: "24px clamp(20px, 4vw, 48px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 2,
        }}
      >
        <Link href="/" style={{ display: "inline-block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo/ISV.webp"
            alt="SSB with ISV Logo"
            style={{ width: "90px", height: "auto", display: "block" }}
          />
        </Link>
      </header>

      {/* Main Centered Content */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px clamp(16px, 4vw, 32px) 60px",
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: 540,
            width: "100%",
            background: "rgba(16, 16, 22, 0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1.5px solid rgba(227, 198, 7, 0.3)",
            borderRadius: 20,
            padding: "clamp(32px, 6vw, 48px) clamp(20px, 5vw, 40px)",
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
          }}
        >
          {/* Checkmark Icon */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(227, 198, 7, 0.2), rgba(210, 161, 0, 0.05))",
              border: "1.5px solid var(--secondary-color, #e3c607)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 0 24px rgba(227, 198, 7, 0.25)",
            }}
          >
            <BiCheckCircle style={{ fontSize: 42, color: "var(--secondary-color, #e3c607)" }} />
          </div>

          {/* Heading */}
          <h1
            style={{
              color: "var(--secondary-color, #e3c607)",
              fontSize: "clamp(28px, 4vw, 36px)",
              fontWeight: 700,
              letterSpacing: "0.01em",
              margin: "0 0 12px",
            }}
          >
            {heading}
          </h1>

          {/* Message */}
          <p
            style={{
              color: "var(--white, #c6c5af)",
              fontSize: "clamp(15px, 2vw, 17px)",
              lineHeight: 1.6,
              maxWidth: 480,
              margin: "0 auto 32px",
            }}
          >
            {message}
          </p>

          {/* Action Button */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 32px",
                backgroundColor: "var(--secondary-color, #e3c607)",
                color: "#050507",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 8,
                textDecoration: "none",
                transition: "opacity 0.2s ease",
              }}
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
