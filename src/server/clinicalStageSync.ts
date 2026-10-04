import { Order, User } from "@/server/models";

/**
 * Resolves a clinicalStage string (e.g. "psych,interview" or "full_course")
 * from an array of selected module IDs.
 *
 * - Empty array, explicit "full_course", or all 4 modules selected resolves to "full_course".
 * - Individual module or subset of modules resolves to a comma-separated string (e.g. "psych,interview").
 */
export function resolveClinicalStageFromModules(bookedModules: string[] = []): string {
  const clean = (bookedModules || []).map((m) => m?.trim()).filter(Boolean);
  if (clean.length === 0 || clean.includes("full_course")) {
    return "full_course";
  }
  const individual = Array.from(new Set(clean.filter((m) => m !== "full_course")));
  if (individual.length >= 4) {
    return "full_course";
  }
  return individual.join(",");
}

/**
 * Synchronizes `User.clinicalStage` based on the student's paid order history.
 *
 * If the student only purchased specific course modules (e.g. Psychology and Interview),
 * their `clinicalStage` is set to those specific modules (e.g. "psych,interview")
 * instead of incorrectly granting "full_course".
 *
 * Offline registrations do not grant clinical stages.
 */
export async function syncClinicalStageForUser(userId: string): Promise<string | null> {
  const paidOrders = await Order.find({ userId, status: "paid" })
    .populate("slotId", "mode isFullCourse")
    .sort({ createdAt: -1 });

  if (!paidOrders || paidOrders.length === 0) return null;

  // Filter only online orders since offline registrations do not have clinicalStage
  const onlineOrders = paidOrders.filter((o) => {
    const slot = o.slotId as unknown as { mode?: string } | null;
    return slot?.mode !== "offline";
  });

  if (onlineOrders.length === 0) return null;

  // Check if any order is full course
  const hasFullCourse = onlineOrders.some((o) => {
    const modules = o.selectedModules || [];
    const slot = o.slotId as unknown as { isFullCourse?: boolean } | null;
    return modules.includes("full_course") || (slot?.isFullCourse && modules.length === 0);
  });

  if (hasFullCourse) {
    await User.findByIdAndUpdate(userId, { clinicalStage: "full_course" });
    return "full_course";
  }

  // Collect all unique modules across all paid online orders
  const allModules = Array.from(
    new Set(
      onlineOrders.flatMap((o) => o.selectedModules || []).filter((m: string) => m && m !== "full_course")
    )
  );

  const stage = resolveClinicalStageFromModules(allModules);
  await User.findByIdAndUpdate(userId, { clinicalStage: stage });
  return stage;
}
