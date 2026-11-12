import type { Metadata } from "next";
import GalleryView from "./GalleryView";

export const metadata: Metadata = {
  title: "Gallery - SSB Training Moments | SSB with ISV",
  description:
    "Explore photos and moments from SSB with ISV online training sessions, VTX™ virtual GTO tasks, group activities, and officer-like qualities development programmes.",
  alternates: {
    canonical: "https://ssbwithisv.in/Gallery",
  },
};

export default function GalleryPage() {
  return <GalleryView />;
}
