// Razorpay's public key_id is not a secret (it ships in checkout.js anyway).
// Read from env so a staging/test deployment can point at rzp_test_ keys
// without a code change; falls back to the production key so a production
// build without the var set behaves exactly as before.
export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_live_SdgMS7X9M3RZSi";
