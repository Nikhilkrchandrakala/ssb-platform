"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "@/app/admin/styles/legacy-blog.css";

interface BlogImage {
  imageUrl: string;
  imageText?: string;
}

interface Blog {
  _id: string;
  title: string;
  shortDescription: string;
  authorName: string;
  authorQuote?: string;
  timeDuration?: string;
  images?: BlogImage[];
  createdAt?: string;
  updatedAt?: string;
}

const PLACEHOLDER = "https://via.placeholder.com/400x200/1f1f1f/715c20?text=No+Image";
const PLACEHOLDER_ERROR = "https://via.placeholder.com/400x200/1f1f1f/715c20?text=Image+Error";

function formatDate(dateString?: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function BlogListView() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/allBlogs")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load blogs");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setBlogs(Array.isArray(data) ? data : []);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error loading blogs");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = () => {
    setLoading(true);
    fetch("/api/allBlogs")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load blogs");
        return res.json();
      })
      .then((data) => {
        setBlogs(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error loading blogs");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleDelete = async (blogId: string) => {
    const result = await window.Swal?.fire({
      title: "Confirm Delete",
      text: "Are you sure you want to delete this blog? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff6b6b",
      cancelButtonColor: "rgba(255,255,255,0.1)",
      confirmButtonText: "Delete",
      background: "#1a1a1a",
      color: "#fff",
    });

    if (!result?.isConfirmed) return;

    try {
      const response = await fetch(`/api/deleteBlog/${blogId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete blog");
      await window.Swal?.fire({
        icon: "success",
        title: "Deleted",
        text: "Blog deleted successfully",
        background: "#1a1a1a",
        color: "#fff",
        timer: 1500,
        showConfirmButton: false,
      });
      reload();
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Error",
        text: err instanceof Error ? err.message : "Error deleting blog",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  };

  return (
    <div className="container" style={{ maxWidth: 1200, margin: "40px auto", padding: "0 20px" }}>
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <i className="fas fa-newspaper me-2"></i> Blog Management
          </h1>
          <p className="text-muted mb-0">Create, edit and manage your platform articles</p>
        </div>
        <Link href="/admin/Blogs" className="thm-btn">
          <i className="fas fa-plus-circle"></i> Add New Blog
        </Link>
      </div>

      {loading && (
        <div className="loading-spinner text-center" style={{ padding: 50 }}>
          <div className="spinner-border text-warning" role="status"></div>
          <p className="mt-2">Loading blogs...</p>
        </div>
      )}

      {!loading && error && (
        <div className="alert alert-danger">Failed to load blogs: {error}</div>
      )}

      {!loading && !error && blogs.length === 0 && (
        <div className="empty-state text-center" style={{ padding: 60 }}>
          <div className="empty-state-icon mb-3" style={{ fontSize: "4rem", color: "var(--primary-gold)", opacity: 0.5 }}>
            <i className="fas fa-file-alt"></i>
          </div>
          <h3>No Blogs Found</h3>
          <p>You haven&apos;t created any blog posts yet.</p>
          <Link href="/admin/Blogs" className="thm-btn">
            <i className="fas fa-plus"></i> Add Your First Blog
          </Link>
        </div>
      )}

      {!loading && !error && blogs.length > 0 && (
        <div className="row">
          {blogs.map((blog) => {
            const blogImage = blog.images && blog.images.length > 0 && blog.images[0].imageUrl
              ? blog.images[0].imageUrl
              : PLACEHOLDER;
            const formattedDate = formatDate(blog.createdAt || blog.updatedAt);
            const title = blog.title.length > 50 ? `${blog.title.substring(0, 50)}...` : blog.title;
            const excerpt = blog.shortDescription.length > 100
              ? `${blog.shortDescription.substring(0, 100)}...`
              : blog.shortDescription;

            return (
              <div className="col-md-6 col-lg-4 mb-4" key={blog._id}>
                <div className="blog-card">
                  <div className="blog-image-wrapper">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={blogImage}
                      alt={blog.title}
                      className="blog-image"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_ERROR;
                      }}
                    />
                  </div>
                  <h3 className="blog-title" title={blog.title}>
                    {title}
                  </h3>
                  <p className="blog-excerpt">{excerpt}</p>
                  <div className="blog-meta">
                    <span>
                      <i className="fas fa-user me-1"></i> {blog.authorName}
                    </span>
                    <span>
                      <i className="far fa-calendar me-1"></i> {formattedDate}
                    </span>
                  </div>
                  <div className="blog-actions">
                    <Link href={`/admin/Blogs?id=${blog._id}`} className="action-icon-btn">
                      <i className="fas fa-edit"></i> Edit
                    </Link>
                    <button className="action-icon-btn delete" onClick={() => handleDelete(blog._id)}>
                      <i className="fas fa-trash-alt"></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
