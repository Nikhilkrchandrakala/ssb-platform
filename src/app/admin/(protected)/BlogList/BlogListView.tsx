"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Newspaper,
  PlusCircle,
  Search,
  FileText,
  Plus,
  Filter,
  User,
  CalendarDays,
  Pencil,
  Trash2,
} from "lucide-react";
import "@/app/admin/styles/legacy-blog.css";

const ICON_STYLE = { verticalAlign: -2 };

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
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

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

  const filteredBlogs = blogs
    .filter((blog) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return blog.title.toLowerCase().includes(q) || blog.authorName?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

  return (
    <div className="container" style={{ maxWidth: 1200, margin: "40px auto", padding: "0 20px" }}>
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <Newspaper size={20} className="me-2" style={ICON_STYLE} /> Blog Management
          </h1>
          <p className="text-muted mb-0">Create, edit and manage your platform articles</p>
        </div>
        <Link href="/admin/Blogs" className="thm-btn">
          <PlusCircle size={16} style={ICON_STYLE} /> Add New Blog
        </Link>
      </div>

      {!loading && !error && blogs.length > 0 && (
        <div className="d-flex flex-wrap gap-3 align-items-center mb-4">
          <div style={{ position: "relative", maxWidth: 320, width: "100%" }}>
            <Search
              size={16}
              style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
            />
            <input
              type="text"
              className="admin-input"
              placeholder="Search by title or author..."
              style={{ paddingLeft: 45, borderRadius: 20 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="admin-input form-select"
            style={{ maxWidth: 180 }}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <span className="text-muted small">
            Showing {filteredBlogs.length} of {blogs.length}
          </span>
        </div>
      )}

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
          <div className="empty-state-icon mb-3" style={{ color: "var(--primary-gold)", opacity: 0.5 }}>
            <FileText size={64} />
          </div>
          <h3>No Blogs Found</h3>
          <p>You haven&apos;t created any blog posts yet.</p>
          <Link href="/admin/Blogs" className="thm-btn">
            <Plus size={14} style={ICON_STYLE} /> Add Your First Blog
          </Link>
        </div>
      )}

      {!loading && !error && blogs.length > 0 && filteredBlogs.length === 0 && (
        <div className="empty-state text-center" style={{ padding: 60 }}>
          <div className="empty-state-icon mb-3" style={{ color: "var(--primary-gold)", opacity: 0.5 }}>
            <Filter size={64} />
          </div>
          <h3>No Matches</h3>
          <p>No blogs match your search.</p>
        </div>
      )}

      {!loading && !error && filteredBlogs.length > 0 && (
        <div className="row">
          {filteredBlogs.map((blog) => {
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
                      <User size={12} className="me-1" style={ICON_STYLE} /> {blog.authorName}
                    </span>
                    <span>
                      <CalendarDays size={12} className="me-1" style={ICON_STYLE} /> {formattedDate}
                    </span>
                  </div>
                  <div className="blog-actions">
                    <Link href={`/admin/Blogs?id=${blog._id}`} className="action-icon-btn">
                      <Pencil size={14} style={ICON_STYLE} /> Edit
                    </Link>
                    <button className="action-icon-btn delete" onClick={() => handleDelete(blog._id)}>
                      <Trash2 size={14} style={ICON_STYLE} /> Delete
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
