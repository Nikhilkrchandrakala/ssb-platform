import { requireSiteUser } from "@/server/auth";
import ProfilePageClient, { type ProfilePageUser } from "./ProfilePageClient";

export const metadata = {
  title: "My Profile",
  description: "Manage your SSB with ISV Aspirant profile and account details.",
  robots: { index: false, follow: false }
};

// Server-side auth guard — replaces legacy AuthRoute's client-side localStorage
// JWT check entirely. No session -> redirect before any HTML is sent; a staff
// session (owner/admin/assessor/franchise) is redirected to the admin panel
// instead of rendering this candidate-only profile page for them.
export default async function ProfilePage() {
  const user = await requireSiteUser();

  const profileUser: ProfilePageUser = {
    name: (user.name as string) || "",
    email: (user.email as string) || "",
    phone: (user.phone as string) || "",
    Address: (user.Address as string) || "",
    profileImage: (user.profileImage as string) || "",
  };

  return <ProfilePageClient user={profileUser} />;
}
