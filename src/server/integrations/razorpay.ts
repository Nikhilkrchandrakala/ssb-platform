import Razorpay from "razorpay";
import crypto from "node:crypto";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

/** Verifies the HMAC signature Razorpay returns after checkout, per their standard checkout flow. */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return expected === params.signature;
}

/** Verifies a Razorpay webhook payload signature (`x-razorpay-signature` header). */
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}

/**
 * Sales module (salesimplementation.md Phase 2). Creates a real, shareable
 * Razorpay Payment Link for a single installment amount — distinct from
 * `razorpay.orders.create` (self-serve checkout), which needs a logged-in
 * student session the sales flow's not-yet-a-student lead doesn't have yet.
 */
export async function createPaymentLink(opts: {
  amountRupees: number;
  customerName: string;
  customerEmail: string;
  description?: string;
  notes?: Record<string, string>;
}) {
  return razorpay.paymentLink.create({
    amount: Math.round(opts.amountRupees * 100),
    currency: "INR",
    customer: { name: opts.customerName, email: opts.customerEmail },
    notify: { email: true, sms: false },
    description: opts.description,
    notes: opts.notes,
  });
}
