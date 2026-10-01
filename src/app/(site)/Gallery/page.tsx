import type { Metadata } from "next";
import GalleryView from "./GalleryView";

export const metadata: Metadata = {
  title: "Gallery - SSB Training Moments | SSB with ISV",
  description:
    "Explore photos and moments from SSB with ISV training sessions, GTO tasks, group activities, and officer-like qualities development programmes — online and at our Nagpur campus.",
  alternates: {
    canonical: "https://ssbwithisv.in/Gallery",
  },
};

export default function GalleryPage() {
  return <GalleryView />;
}
