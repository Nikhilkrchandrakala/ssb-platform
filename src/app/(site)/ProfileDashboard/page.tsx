import { requireSiteUser } from "@/server/auth";
import { connectDB } from "@/server/db";
import { Order, MagazinePdf } from "@/server/models";
import ProfileDashboardClient, { type DashboardOrder, type DashboardUser, type DashboardMagazine } from "./ProfileDashboardClient";

export const metadata = {
  title: "My Dashboard | SSB with ISV",
};

// Server-side auth guard: replaces legacy AuthRoute's client-side localStorage
// JWT + expiry check entirely. requireSiteUser() resolves the httpOnly session
// cookie and redirects before any HTML/JS reaches the client — no
// LoadingScreen/flash-of-content needed, and no staff session ever renders
// this candidate-only dashboard.
export default async function ProfileDashboardPage() {
  const user = await requireSiteUser();

  await connectDB();

  // Mirrors the bug-fixed /api/user/purchasedCourses query (Order never had
  // a `courseId` field — only `slotId`, which is what's populated here).
  const orders = await Order.find({
    userId: String(user._id),
    status: "paid",
  })
    .populate("slotId", "title price startTime endTime batchNo isFullCourse")
    // Sales Phase 3: lets the dashboard render a "Pay Now" button for any
    // still-pending installment on a sales-enrolled order (see below).
    .populate("installmentPlanId", "status installments")
    .sort({ createdAt: -1 })
    .lean();

  const magazines = await MagazinePdf.find({}).lean();

  return (
    <ProfileDashboardClient
      user={JSON.parse(JSON.stringify(user)) as DashboardUser}
      orders={JSON.parse(JSON.stringify(orders)) as DashboardOrder[]}
      magazines={JSON.parse(JSON.stringify(magazines)) as DashboardMagazine[]}
    />
  );
}
