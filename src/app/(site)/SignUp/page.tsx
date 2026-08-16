import { getAuthDisplaySettings } from "@/server/authDisplaySettings";
import SignUpClient from "./SignUpClient";

export default async function SignUpPage() {
  const initialDisplaySettings = await getAuthDisplaySettings().catch(() => null);
  return <SignUpClient initialDisplaySettings={initialDisplaySettings} />;
}
