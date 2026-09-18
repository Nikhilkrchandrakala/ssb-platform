import type { Metadata } from "next";
import CoursesOfflineView from "./CoursesOfflineView";

export const metadata: Metadata = {
  title: "Offline SSB Coaching in Nagpur | 12-Day Residential Programme | SSB with ISV",
  description:
    "12-day fully residential, in-person SSB coaching at our Nagpur campus — GTO ground, psychology tests, and personal interview training by DIPR certified ex-SSB assessors. Food, stay & station transfer included.",
  alternates: {
    canonical: "https://ssbwithisv.in/CoursesOffline",
  },
};

export default function CoursesOfflinePage() {
  return <CoursesOfflineView />;
}
