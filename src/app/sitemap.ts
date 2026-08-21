import type { MetadataRoute } from "next";
import { connectDB } from "@/server/db";
import { Blog } from "@/server/models";
import { slugifyBlogTitle } from "./(site)/blogs/utils";

const baseUrl = (process.env.CLIENT_URL ?? "https://ssbwithisv.in").replace(/\/$/, "");

const staticRoutes = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/aboutSSB", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/aboutssbwithisv", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/Contactus", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/Courses", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/Batches", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/Gallery", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/HalfOfFame", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/Magazine", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/ssbVirtualTrainingXperience", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/blogs", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/PrivacyPolicy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/TermsConditions", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/RefundCancellation", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/OfficerLikeQualities", changeFrequency: "monthly" as const, priority: 0.7 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  try {
    await connectDB();
    const blogs = await Blog.find()
      .select("title updatedAt")
      .lean<{ title: string; updatedAt?: Date }[]>();

    for (const blog of blogs) {
      const slug = slugifyBlogTitle(blog.title);
      if (!slug) continue;
      entries.push({
        url: `${baseUrl}/blogs/${slug}`,
        lastModified: blog.updatedAt,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    // DB unreachable at build/export time — ship the static routes only.
  }

  return entries;
}
