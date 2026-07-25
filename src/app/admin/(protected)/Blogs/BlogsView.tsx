"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import "@/app/admin/styles/legacy-blog.css";

// CKEditor 5 classic build (loaded via CDN <Script> below) attaches itself to
// `window.ClassicEditor`. Declared locally only — this page is the sole
// consumer of CKEditor in the admin panel, so the global type stays local
// rather than polluting the shared src/global.d.ts.
interface CKEditorInstance {
  getData: () => string;
  setData: (data: string) => void;
  destroy: () => Promise<void>;
}
declare global {
  interface Window {
    ClassicEditor?: {
      create: (
        element: Element,
        config?: Record<string, unknown>
      ) => Promise<CKEditorInstance>;
    };
  }
}

interface BlogImage {
  imageUrl: string;
  imageText: string;
}

interface NewImage {
  id: string;
  file: File;
  src: string;
  imageText: string;
}

interface BlogsViewProps {
  blogId?: string;
}

const API_BASE_LIST_URL = "/admin/BlogList";

export default function BlogsView({ blogId }: BlogsViewProps) {
  const router = useRouter();
  const isEditMode = Boolean(blogId);

  const [ckReady, setCkReady] = useState(false);
  const [ckFailed, setCkFailed] = useState(false);
  const editorRef = useRef<CKEditorInstance | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const fallbackTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorQuote, setAuthorQuote] = useState("");
  const [timeDuration, setTimeDuration] = useState("");
  const [pendingContent, setPendingContent] = useState<string | null>(null);

  const [existingImages, setExistingImages] = useState<BlogImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<NewImage[]>([]);

  const [loadingBlog, setLoadingBlog] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  // Init CKEditor once the CDN script has loaded.
  useEffect(() => {
    if (!ckReady || !editorContainerRef.current) return;
    let cancelled = false;
    const container = editorContainerRef.current;

    Promise.resolve()
      .then(() => {
        if (!window.ClassicEditor) throw new Error("ClassicEditor failed to load");
        return window.ClassicEditor.create(container, {
          toolbar: ["heading", "|", "bold", "italic", "link", "bulletedList", "numberedList", "|", "undo", "redo"],
          placeholder: "Compose your insightful article here...",
        });
      })
      .then((instance) => {
        if (cancelled) {
          instance.destroy();
          return;
        }
        editorRef.current = instance;
        if (pendingContent) instance.setData(pendingContent);
      })
      .catch(() => {
        if (!cancelled) setCkFailed(true);
      });

    return () => {
      cancelled = true;
      if (editorRef.current) {
        editorRef.current.destroy().catch(() => {});
        editorRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ckReady]);

  // Load blog for edit mode.
  useEffect(() => {
    if (!blogId) return;
    let cancelled = false;
    fetch(`/api/blogDetail/${blogId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Blog post not found.");
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const blog = json?.data;
        if (!blog) throw new Error("Blog post not found.");
        setTitle(blog.title || "");
        setShortDescription(blog.shortDescription || "");
        setAuthorName(blog.authorName || "");
        setAuthorQuote(blog.authorQuote || "");
        setTimeDuration(blog.timeDuration || "");
        setExistingImages(blog.images || []);
        const content = blog.content || "";
        if (editorRef.current) {
          editorRef.current.setData(content);
        } else {
          setPendingContent(content);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          window.Swal?.fire({
            icon: "error",
            title: "Load Failed",
            text: err instanceof Error ? err.message : "Failed to load blog",
            background: "#1a1a1a",
            color: "#fff",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBlog(false);
      });
    return () => {
      cancelled = true;
    };
  }, [blogId]);

  const handleImageFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = String(ev.target?.result || "");
        setUploadedImages((prev) => [
          ...prev,
          { id: `${Date.now()}-${Math.random()}`, file, src, imageText: "" },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeNewImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => {
      const target = prev[index];
      if (target) setImagesToDelete((del) => [...del, target.imageUrl]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateExistingText = (index: number, value: string) => {
    setExistingImages((prev) => prev.map((img, i) => (i === index ? { ...img, imageText: value } : img)));
  };

  const updateNewText = (id: string, value: string) => {
    setUploadedImages((prev) => prev.map((img) => (img.id === id ? { ...img, imageText: value } : img)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const content = editorRef.current
      ? editorRef.current.getData()
      : fallbackTextareaRef.current?.value || "";

    if (!content.trim()) {
      window.Swal?.fire({
        icon: "warning",
        text: "Article content cannot be empty.",
        background: "#1a1a1a",
        color: "#fff",
      });
      return;
    }

    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("shortDescription", shortDescription.trim());
    fd.append("content", content);
    fd.append("authorName", authorName.trim());
    fd.append("authorQuote", authorQuote.trim());
    fd.append("timeDuration", timeDuration.trim());

    uploadedImages.forEach((img) => {
      fd.append("images", img.file);
      fd.append("imageTexts", img.imageText || "");
    });

    if (isEditMode) {
      fd.append(
        "existingImageTexts",
        JSON.stringify(existingImages.map((img) => ({ imageUrl: img.imageUrl, imageText: img.imageText || "" })))
      );
      if (imagesToDelete.length > 0) fd.append("imagesToDelete", JSON.stringify(imagesToDelete));
    }

    try {
      setSubmitting(true);
      const url = isEditMode ? `/api/updateBlog/${blogId}` : "/api/addBlog";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, { method, body: fd });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message || "Action failed.");

      await window.Swal?.fire({
        icon: "success",
        title: "Success!",
        text: `Article ${isEditMode ? "updated" : "published"} successfully.`,
        background: "#1a1a1a",
        color: "#fff",
      });
      router.push(API_BASE_LIST_URL);
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Submission Failed",
        text: err instanceof Error ? err.message : "Action failed",
        background: "#1a1a1a",
        color: "#fff",
      });
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    const result = await window.Swal?.fire({
      title: "Discard Changes?",
      text: "Any unsaved progress will be lost.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ff6b6b",
      cancelButtonColor: "rgba(255,255,255,0.1)",
      confirmButtonText: "Yes, Discard",
      background: "#1a1a1a",
      color: "#fff",
    });
    if (result?.isConfirmed) router.push(API_BASE_LIST_URL);
  };

  return (
    <>
      <Script
        src="https://cdn.ckeditor.com/ckeditor5/41.0.0/classic/ckeditor.js"
        strategy="afterInteractive"
        onLoad={() => setCkReady(true)}
        onError={() => setCkFailed(true)}
      />

      <div className="container" style={{ maxWidth: 1000, margin: "40px auto", padding: "0 20px" }}>
        <div className="admin-page-header">
          <div className="header-left">
            <h1 className="admin-page-title">
              <i className={`fas ${isEditMode ? "fa-edit" : "fa-plus-circle"} me-2`}></i>{" "}
              {isEditMode ? "Edit Blog Post" : "Create Blog Post"}
            </h1>
            <p className="text-muted mb-0">Compose and publish insightful articles for your audience</p>
          </div>
          <Link
            href={API_BASE_LIST_URL}
            className="thm-btn"
            style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
          >
            <i className="fas fa-arrow-left me-2"></i> Back to List
          </Link>
        </div>

        <div className="blog-editor-card">
          {loadingBlog ? (
            <div className="text-center py-5">
              <div className="spinner-border text-warning" role="status"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="section-title">
                <i className="fas fa-info-circle"></i> Basic Information
              </div>
              <div className="mb-4">
                <label className="admin-form-label">Blog Title *</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. Master the SSB Interview"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="admin-form-label">Short Summary *</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  placeholder="A brief catchphrase for the blog list (max 200 chars)"
                  required
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                />
              </div>

              <div className="section-divider"></div>

              <div className="section-title">
                <i className="fas fa-pen-nib"></i> Article Content
              </div>
              <div className="mb-4">
                <label className="admin-form-label">Full Content *</label>
                {!ckFailed ? (
                  <div id="editorContainer" ref={editorContainerRef}></div>
                ) : (
                  <textarea className="admin-input" id="fallbackEditor" rows={15} ref={fallbackTextareaRef} />
                )}
              </div>

              <div className="section-divider"></div>

              <div className="section-title">
                <i className="fas fa-images"></i> Media & Visuals
              </div>
              <div className="mb-3">
                <label className="admin-form-label">Upload Blog Images</label>
                <label className="upload-area" style={{ display: "block" }}>
                  <i className="fas fa-cloud-upload-alt"></i>
                  <h5>Click or Drag images to upload</h5>
                  <p className="text-muted small">PNG, JPG or GIF up to 5MB each (Multiple allowed)</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      handleImageFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="preview-grid mb-4">
                {isEditMode && existingImages.length > 0 && (
                  <>
                    <h6 className="mb-3 text-muted" style={{ gridColumn: "1 / -1" }}>
                      EXISTING MEDIA
                    </h6>
                    {existingImages.map((img, i) => (
                      <div className="preview-item" key={`existing-${img.imageUrl}-${i}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.imageUrl} alt="" />
                        <button
                          type="button"
                          className="remove-preview"
                          onClick={() => removeExistingImage(i)}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </>
                )}
                {uploadedImages.length > 0 && (
                  <>
                    <h6 className="mb-3 text-muted" style={{ gridColumn: "1 / -1" }}>
                      NEWLY UPLOADED
                    </h6>
                    {uploadedImages.map((img) => (
                      <div className="preview-item" key={img.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.src} alt="" />
                        <button type="button" className="remove-preview" onClick={() => removeNewImage(img.id)}>
                          &times;
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="image-text-fields mb-4">
                {isEditMode &&
                  existingImages.map((img, i) => (
                    <div className="image-field-row" key={`existing-text-${img.imageUrl}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.imageUrl} className="image-field-thumb" alt="" />
                      <div style={{ flexGrow: 1 }}>
                        <div className="small text-muted mb-1">Existing Image {i + 1} Overlay Text</div>
                        <input
                          type="text"
                          className="admin-input py-1 px-2"
                          style={{ fontSize: "0.85rem" }}
                          placeholder="Text shown on image..."
                          value={img.imageText || ""}
                          onChange={(e) => updateExistingText(i, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                {uploadedImages.map((img, i) => (
                  <div className="image-field-row" key={img.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} className="image-field-thumb" alt="" />
                    <div style={{ flexGrow: 1 }}>
                      <div className="small text-muted mb-1">New Image {i + 1} Overlay Text</div>
                      <input
                        type="text"
                        className="admin-input py-1 px-2"
                        style={{ fontSize: "0.85rem" }}
                        placeholder="Text shown on image..."
                        value={img.imageText}
                        onChange={(e) => updateNewText(img.id, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="section-divider"></div>

              <div className="section-title">
                <i className="fas fa-user-edit"></i> Publication Credits
              </div>
              <div className="row">
                <div className="col-md-6 mb-4">
                  <label className="admin-form-label">Author Name *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Capt. Vikram Batra"
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                  />
                </div>
                <div className="col-md-6 mb-4">
                  <label className="admin-form-label">Read Time (Duration) *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. 5 min read"
                    required
                    value={timeDuration}
                    onChange={(e) => setTimeDuration(e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="admin-form-label">Author Quote (Optional)</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="A short inspiring quote from the author"
                  value={authorQuote}
                  onChange={(e) => setAuthorQuote(e.target.value)}
                />
              </div>

              <div className="mt-5 d-flex gap-3">
                <button type="submit" className="thm-btn" style={{ minWidth: 200 }} disabled={submitting}>
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin me-2"></i> Processing...
                    </>
                  ) : (
                    <>
                      <i className={`fas ${isEditMode ? "fa-save" : "fa-paper-plane"} me-2`}></i>{" "}
                      {isEditMode ? "Update Article" : "Publish Article"}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="thm-btn"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
                  onClick={handleCancel}
                >
                  Discard Changes
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
