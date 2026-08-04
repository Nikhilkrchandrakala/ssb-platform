import fs from "fs";
import path from "path";
const envFiles = [".env.local", ".env"];
for (const envFile of envFiles) {
  const file = path.join(process.cwd(), envFile);
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf-8").split(/\r?\n/)) {
      const m = line.trim().match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
(async () => {
  const mongoose = (await import("mongoose")).default;
  await mongoose.connect(process.env.MONGODB_URI as string);
  const { User } = await import("../src/server/models/User");
  const { Order } = await import("../src/server/models/Order");
  const { InstallmentPlan } = await import("../src/server/models/InstallmentPlan");

  console.log("Connected to:", mongoose.connection.host, "/", mongoose.connection.name);

  const user = await User.findOne({ email: "test2@gmail.com" }).lean();
  console.log("\nUser:", user ? { _id: (user as { _id: unknown })._id, name: (user as { name?: string }).name, role: (user as { role?: string }).role } : "NOT FOUND");
  if (!user) return mongoose.disconnect();

  const orders = await Order.find({ userId: (user as { _id: unknown })._id }).lean();
  console.log(`\nFound ${orders.length} order(s) for this user:`);
  for (const o of orders as Record<string, unknown>[]) {
    console.log({
      _id: o._id,
      status: o.status,
      bookingMethod: o.bookingMethod,
      price: o.price,
      installmentPlanId: o.installmentPlanId,
      slotId: o.slotId,
      orderId: o.orderId,
      createdAt: o.createdAt,
    });
    if (o.installmentPlanId) {
      const plan = await InstallmentPlan.findById(o.installmentPlanId).lean();
      console.log("  -> Linked InstallmentPlan:", plan ? {
        _id: (plan as { _id: unknown })._id,
        status: (plan as { status?: string }).status,
        totalAmount: (plan as { totalAmount?: number }).totalAmount,
        installments: (plan as { installments?: unknown[] }).installments,
      } : "PLAN ID SET BUT DOCUMENT NOT FOUND (orphaned reference!)");
    } else {
      console.log("  -> No installmentPlanId on this Order at all.");
    }
  }

  await mongoose.disconnect();
})();
