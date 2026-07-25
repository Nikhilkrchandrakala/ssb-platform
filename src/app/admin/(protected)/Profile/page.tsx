import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import ProfileView from "./ProfileView";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin");
  return <ProfileView />;
}
