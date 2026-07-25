import type { MetadataRoute } from "next";

const baseUrl = (process.env.CLIENT_URL ?? "https://ssbwithisv.in").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/admin/",
        "/psych-battery",
        "/psych-battery/",
        "/SignIn",
        "/SignUp",
        "/AccountRecovery",
        "/ProfileDashboard",
        "/OrderHistory",
        "/PaymentHistory",
        "/profile",
        "/Success",
        "/Successful",
        "/auth/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
