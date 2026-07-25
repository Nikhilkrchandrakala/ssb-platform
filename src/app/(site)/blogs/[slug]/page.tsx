import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/server/db";
import { Blog } from "@/server/models";
import CustomHeader from "@/components/site/CustomHeader";
import styles from "@/style/BlogDetails.module.css";
import { slugifyBlogTitle } from "../utils";
import BlogImageSlider from "./BlogImageSlider";
import BackArrowButton from "./BackArrowButton";

type BlogDetail = {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  images: { imageUrl: string; imageText: string }[];
  timeDuration?: string;
  authorName: string;
  authorQuote?: string;
  createdAt: string;
};

async function getBlogBySlug(slug: string): Promise<BlogDetail | null> {
  await connectDB();
  const blogs = await Blog.find()
    .select("title shortDescription content images timeDuration authorName authorQuote createdAt")
    .lean<
      {
        _id: unknown;
        title: string;
        shortDescription: string;
        content: string;
        images?: { imageUrl: string; imageText?: string }[];
        timeDuration?: string;
        authorName: string;
        authorQuote?: string;
        createdAt: Date;
      }[]
    >();

  const matched = blogs.find((blog) => slugifyBlogTitle(blog.title) === slug);
  if (!matched) return null;

  return {
    id: String(matched._id),
    title: matched.title,
    shortDescription: matched.shortDescription,
    content: matched.content,
    images: (matched.images ?? []).map((img) => ({ imageUrl: img.imageUrl, imageText: img.imageText ?? "" })),
    timeDuration: matched.timeDuration,
    authorName: matched.authorName,
    authorQuote: matched.authorQuote,
    createdAt: matched.createdAt ? new Date(matched.createdAt).toISOString() : "",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    return {
      title: "Blog Details | SSB with ISV",
    };
  }

  return {
    title: `${blog.title} | SSB Preparation Blog | SSB with ISV`,
    description:
      blog.shortDescription ||
      "Read expert SSB preparation guides, tips and insights on SSB psychology tests, GTO tasks, and interview preparation.",
    alternates: {
      canonical: `https://ssbwithisv.in/blogs/${slug}`,
    },
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    notFound();
  }

  return (
    <>
      <CustomHeader
        heading="Blog Details"
        text="Detailed view of the selected blog post."
        banner="/assets/website/blogs_banner.webp"
      />

      <BackArrowButton />

      <section className={styles.blogDetail}>
        <div className={styles.container}>
          <p className={styles.meta}>{blog.createdAt ? new Date(blog.createdAt).toDateString() : ""}</p>

          <h1 className={styles.title}>{blog.title}</h1>

          <p className={styles.intro}>{blog.shortDescription}</p>

          {blog.timeDuration && <p className={styles.intro}>Time: {blog.timeDuration}</p>}

          {blog.images.length > 0 && <BlogImageSlider images={blog.images} title={blog.title} />}

          <div className={styles.content} dangerouslySetInnerHTML={{ __html: blog.content }} />

          {blog.authorQuote && (
            <blockquote className={styles.quote}>
              <span className={styles.quoteDot}></span>
              <div>
                <p>{blog.authorQuote}</p>
                <span className={styles.quoteAuthor}>— {blog.authorName}</span>
              </div>
            </blockquote>
          )}
        </div>
      </section>
    </>
  );
}
