import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { connectDB } from "@/server/db";
import { Order, MagazinePdf } from "@/server/models";
import ProfileDashboardClient, { type DashboardOrder, type DashboardUser, type DashboardMagazine } from "./ProfileDashboardClient";

export const metadata = {
  title: "My Dashboard | SSB with ISV",
};

// Server-side auth guard: replaces legacy AuthRoute's client-side localStorage
// JWT + expiry check entirely. getCurrentUser() resolves the httpOnly session
// cookie; if there's no valid session, redirect() sends the response before
// any HTML/JS reaches the client — no LoadingScreen/flash-of-content needed.
export default async function ProfileDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/SignIn");

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
