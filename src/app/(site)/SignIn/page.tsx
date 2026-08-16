import { getAuthDisplaySettings } from "@/server/authDisplaySettings";
import SignInClient from "./SignInClient";

export default async function SignInPage() {
  const initialDisplaySettings = await getAuthDisplaySettings().catch(() => null);
  return <SignInClient initialDisplaySettings={initialDisplaySettings} />;
}
