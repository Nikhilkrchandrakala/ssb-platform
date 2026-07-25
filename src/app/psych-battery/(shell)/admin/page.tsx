import { getCurrentUser } from "@/server/auth";
import { requirePsychAdmin } from "@/server/psychAccess";
import AdminDashboardView from "./AdminDashboardView";

// Ported from psych_battery/src/pages/AdminDashboard.tsx.
// Legacy read `?tab=` via react-router's useSearchParams(); here it's
// resolved server-side from the async `searchParams` prop and handed down
// as a plain prop, so the client view never needs its own Suspense boundary
// for useSearchParams().
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  requirePsychAdmin(user);
  const { tab } = await searchParams;

  return <AdminDashboardView tab={tab} />;
}
