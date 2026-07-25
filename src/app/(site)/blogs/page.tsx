import type { Metadata } from "next";
import Link from "next/link";
import { connectDB } from "@/server/db";
import { Blog } from "@/server/models";
import CustomHeader from "@/components/site/CustomHeader";
import styles from "@/style/Blog.module.css";
import { slugifyBlogTitle } from "./utils";

export const metadata: Metadata = {
  title: "SSB Preparation Blog | Expert SSB Interview Tips & Guides | SSB with ISV",
  description:
    "Read expert SSB preparation guides, tips and insights on SSB psychology tests, GTO tasks, interview preparation and officer-like qualities. Written by ex-SSB assessors.",
  alternates: {
    canonical: "https://ssbwithisv.in/blogs",
  },
};

const HEADER_DATA = {
  heading: "Blogs",
  text: "SSB with ISV blogs bring you practical tips, real insights, and current topics to help you prepare smarter for the SSB.",
  banner: "/assets/website/blogs_banner.webp",
};

type BlogListItem = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  createdAt: string;
  imageUrl?: string;
};

async function getBlogs(): Promise<BlogListItem[]> {
  await connectDB();
  const blogs = await Blog.find()
    .select("title shortDescription images createdAt")
    .sort({ createdAt: -1 })
    .lean<
      {
        _id: unknown;
        title: string;
        shortDescription: string;
        images?: { imageUrl: string }[];
        createdAt: Date;
      }[]
    >();

  return blogs.map((blog) => ({
    id: String(blog._id),
    slug: slugifyBlogTitle(blog.title),
    title: blog.title,
    shortDescription: blog.shortDescription,
    createdAt: blog.createdAt ? new Date(blog.createdAt).toISOString() : "",
    imageUrl: blog.images?.[0]?.imageUrl,
  }));
}

export default async function BlogsPage() {
  const blogs = await getBlogs();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://ssbwithisv.in/",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Blogs",
                item: "https://ssbwithisv.in/blogs",
              },
            ],
          }),
        }}
      />

      <CustomHeader heading={HEADER_DATA.heading} text={HEADER_DATA.text} banner={HEADER_DATA.banner} />

      <section className={styles.blogSection}>
        <div className="container">
          {blogs.length === 0 ? (
            <p className="text-center mt-5">No blogs found.</p>
          ) : (
            blogs.map((blog) => (
              <Link key={blog.id} href={`/blogs/${blog.slug}`} className={styles.blogCard}>
                <div className={styles.imageWrapper}>
                  <img src={blog.imageUrl} alt={blog.title} />
                  <div className={styles.imageOverlay}></div>
                </div>

                <div className={styles.contentWrapper}>
                  <h2 className={styles.blogTitle}>{blog.title}</h2>

                  <p className={styles.blogDescription}>{blog.shortDescription}</p>

                  <p className={styles.blogDate}>{blog.createdAt ? new Date(blog.createdAt).toDateString() : ""}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </>
  );
}
