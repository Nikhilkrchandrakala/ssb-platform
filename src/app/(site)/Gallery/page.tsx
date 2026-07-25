import type { Metadata } from "next";
import GalleryView from "./GalleryView";

export const metadata: Metadata = {
  title: "Gallery - SSB Training Moments",
  alternates: {
    canonical: "https://ssbwithisv.in/Gallery",
  },
};

export default function GalleryPage() {
  return <GalleryView />;
}
