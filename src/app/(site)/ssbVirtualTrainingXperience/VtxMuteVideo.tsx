"use client";

import { useRef, useState } from "react";
import { VscUnmute } from "react-icons/vsc";
import { IoVolumeMuteSharp } from "react-icons/io5";
import styles from "@/style/UniquePedagogy.module.css";

/**
 * The muted-by-default looping GTO-ground footage with a mute/unmute toggle.
 * Ported from the <video>/mute-button block in GtoTrain.jsx.
 */
export default function VtxMuteVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  return (
    <>
      <video className={styles.imageSection} autoPlay loop playsInline ref={videoRef} muted={isMuted}>
        <source src="/assets/video/0125(6).mp4" type="video/mp4" />
      </video>

      <div className="d-flex justify-content-end  ">
        <button
          className={styles.MuteBtn}
          onClick={() => {
            setIsMuted(!isMuted);
            if (videoRef.current) {
              videoRef.current.muted = !isMuted;
            }
          }}
        >
          {!isMuted ? <VscUnmute /> : <IoVolumeMuteSharp />}
        </button>
      </div>
    </>
  );
}
