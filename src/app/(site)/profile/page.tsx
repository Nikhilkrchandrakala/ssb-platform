import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import ProfilePageClient, { type ProfilePageUser } from "./ProfilePageClient";

export const metadata = {
  title: "My Profile | SSB with ISV",
};

// Server-side auth guard — replaces legacy AuthRoute's client-side localStorage
// JWT check entirely. No session -> redirect before any HTML is sent.
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/SignIn");

  const profileUser: ProfilePageUser = {
    name: (user.name as string) || "",
    email: (user.email as string) || "",
    phone: (user.phone as string) || "",
    Address: (user.Address as string) || "",
    profileImage: (user.profileImage as string) || "",
  };

  return <ProfilePageClient user={profileUser} />;
}
