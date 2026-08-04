"use client";

import { useEffect, useRef, useState } from "react";
import {
  Images,
  UploadCloud,
  Camera,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import "@/app/admin/styles/legacy-gallery.css";

const ICON_STYLE = { verticalAlign: -2 };

interface GalleryImage {
  imageUrl: string;
  imageText?: string;
  _id?: string;
}

interface GalleryDoc {
  _id: string;
  title: string;
  images: GalleryImage[];
}

interface FlatImage {
  galleryId: string;
  imageUrl: string;
  imageText: string;
  key: string;
}

interface NewFilePreview {
  file: File;
  src: string;
}

function escapeText(str?: string) {
  return str || "No description provided";
}

export default function GalleryView() {
  const [galleries, setGalleries] = useState<GalleryDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previews, setPreviews] = useState<NewFilePreview[]>([]);
  const [captions, setCaptions] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ galleryId: string; url: string } | null>(null);
  const [editCaptionText, setEditCaptionText] = useState("");
  const [editReplaceFile, setEditReplaceFile] = useState<File | null>(null);
  const [editPreviewSrc, setEditPreviewSrc] = useState("");
  const [saving, setSaving] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/allGallery")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch gallery data");
        return res.json();
      })
      .then((data: GalleryDoc[]) => {
        if (!cancelled) setGalleries(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          window.Swal?.fire({
            icon: "error",
            title: "Fetch Error",
            text: err instanceof Error ? err.message : "Error",
            background: "#1a1a1a",
            color: "#fff",
          });
        }
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
    fetch("/api/allGallery")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch gallery data");
        return res.json();
      })
      .then((data: GalleryDoc[]) => {
        setGalleries(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        window.Swal?.fire({
          icon: "error",
          title: "Fetch Error",
          text: err instanceof Error ? err.message : "Error",
          background: "#1a1a1a",
          color: "#fff",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const flatImages: FlatImage[] = [];
  galleries.forEach((g) => {
    (g.images || []).forEach((img) => {
      flatImages.push({
        galleryId: g._id,
        imageUrl: img.imageUrl,
        imageText: img.imageText || "",
        key: `${g._id}-${img.imageUrl}`,
      });
    });
  });

  const openUploadModal = () => {
    setPreviews([]);
    setCaptions([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadModalOpen(true);
  };

  const handleFilesChange = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    if (arr.length > 10) {
      window.Swal?.fire({
        icon: "warning",
        title: "Limit Exceeded",
        text: "Max 10 images allowed per batch.",
        background: "#1a1a1a",
        color: "#fff",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setCaptions(arr.map(() => ""));
    setPreviews([]);
    arr.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = String(ev.target?.result || "");
        setPreviews((prev) => {
          const next = [...prev];
          next[i] = { file, src };
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const startUpload = async () => {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    formData.append("title", `Gallery_${Date.now()}`);
    for (let i = 0; i < files.length; i++) {
      formData.append("images", files[i]);
    }
    formData.append("imageTexts", JSON.stringify(captions));

    try {
      setUploading(true);
      const response = await fetch("/api/addGallery", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload failed");
      window.Swal?.fire({
        icon: "success",
        title: "Assets Secured",
        text: "Images have been added to the gallery.",
        background: "#1a1a1a",
        color: "#fff",
      });
      setUploadModalOpen(false);
      reload();
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Upload Failed",
        text: err instanceof Error ? err.message : "Error",
        background: "#1a1a1a",
        color: "#fff",
      });
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (galleryId: string, url: string, text: string) => {
    setEditTarget({ galleryId, url });
    setEditPreviewSrc(url);
    setEditCaptionText(text);
    setEditReplaceFile(null);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
    setEditModalOpen(true);
  };

  const handleEditFileChange = (file: File | null) => {
    setEditReplaceFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setEditPreviewSrc(String(ev.target?.result || ""));
      reader.readAsDataURL(file);
    }
  };

  const saveEdit = async () => {
    if (!editTarget) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("imageUrl", editTarget.url);
      formData.append("imageText", editCaptionText);
      if (editReplaceFile) formData.append("image", editReplaceFile);

      const response = await fetch(`/api/updateImageText/${editTarget.galleryId}`, {
        method: "PUT",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to update asset");

      window.Swal?.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Asset updated successfully",
        showConfirmButton: false,
        timer: 2000,
        background: "#1a1a1a",
        color: "#fff",
      });
      setEditModalOpen(false);
      reload();
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Update Failed",
        text: err instanceof Error ? err.message : "Error",
        background: "#1a1a1a",
        color: "#fff",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (galleryId: string, url: string) => {
    const result = await window.Swal?.fire({
      title: "Delete Asset?",
      text: "This image will be removed from the gallery permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff6b6b",
      cancelButtonColor: "rgba(255,255,255,0.1)",
      confirmButtonText: "Yes, delete it",
      background: "#1a1a1a",
      color: "#fff",
    });

    if (!result?.isConfirmed) return;

    try {
      // NOTE: the ported /api/updateGallery/[id] route only accepts
      // multipart FormData (matching addGallery/updateCourse's contract),
      // unlike legacy gallery.js which sent a JSON body here — a plain JSON
      // request would be rejected, so imagesToDelete is sent as FormData.
      const formData = new FormData();
      formData.append("imagesToDelete", JSON.stringify([url]));

      const response = await fetch(`/api/updateGallery/${galleryId}`, {
        method: "PUT",
        body: formData,
      });
      if (!response.ok) throw new Error("Delete failed");

      window.Swal?.fire({
        icon: "success",
        title: "Asset Removed",
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
        text: err instanceof Error ? err.message : "Error",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  };

  return (
    <div className="container" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 20px" }}>
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <Images size={20} className="me-2" style={ICON_STYLE} /> Gallery Assets
          </h1>
          <p className="text-muted mb-0">Visual storytelling for the SSB platform - Manage photos and captions</p>
        </div>
        <button className="thm-btn" onClick={openUploadModal}>
          <UploadCloud size={16} className="me-2" style={ICON_STYLE} /> Upload Images
        </button>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-warning" role="status"></div>
          <p className="mt-3 opacity-50">Developing your gallery view...</p>
        </div>
      )}

      {!loading && flatImages.length === 0 && (
        <div className="text-center py-5">
          <Camera size={64} className="mb-3" style={{ opacity: 0.2 }} />
          <h3>No visual assets found</h3>
          <p className="text-muted">Upload your first set of images to showcase them in the frontend gallery.</p>
          <button className="thm-btn mt-3" onClick={openUploadModal}>
            Upload Now
          </button>
        </div>
      )}

      {!loading && flatImages.length > 0 && (
        <div className="gallery-grid">
          {flatImages.map((img) => (
            <div className="gallery-card" key={img.key}>
              <div className="gallery-img-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.imageUrl}
                  className="gallery-img"
                  alt="Gallery"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "https://via.placeholder.com/400x300/111/e0c214?text=Asset+Not+Found";
                  }}
                />
              </div>
              <div className="gallery-info">
                <div className="gallery-caption">{escapeText(img.imageText)}</div>
                <div className="gallery-meta">
                  <span className="small opacity-50">
                    #{img.imageUrl ? img.imageUrl.slice(-6) : "Local"}
                  </span>
                  <div className="d-flex gap-2">
                    <button
                      className="gallery-action-icon"
                      onClick={() => openEdit(img.galleryId, img.imageUrl, img.imageText)}
                      title="Edit Caption"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="gallery-action-icon delete"
                      onClick={() => confirmDelete(img.galleryId, img.imageUrl)}
                      title="Delete Asset"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {uploadModalOpen && (
        <div
          className="admin-modal-overlay"
          style={{ display: "flex" }}
          onClick={() => setUploadModalOpen(false)}
        >
          <div className="admin-modal" style={{ maxWidth: 700, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h5 className="admin-modal-title">
                <Upload size={18} className="me-2 text-warning" style={ICON_STYLE} /> Add Visual Assets
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setUploadModalOpen(false)} aria-label="Close"></button>
            </div>
            <div>
              <div className="mb-4">
                <label className="admin-form-label">Select Source Files</label>
                <input
                  type="file"
                  className="admin-input"
                  accept="image/*"
                  multiple
                  required
                  ref={fileInputRef}
                  onChange={(e) => handleFilesChange(e.target.files)}
                />
                <div className="small opacity-50 mt-1">Maximum 10 images per upload batch. PNG, JPG or WEBP.</div>
              </div>
              {previews.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mb-4">
                  {previews.map((p, i) => (
                    <div className="position-relative" key={`${p.file.name}-${i}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.src} className="preview-thumb" alt="" />
                      <span className="badge bg-warning text-dark position-absolute top-0 end-0 m-1">{i + 1}</span>
                    </div>
                  ))}
                </div>
              )}
              {captions.length > 0 && (
                <div>
                  <label className="admin-form-label mb-3">Add Descriptions (Optional)</label>
                  <div className="row">
                    {captions.map((val, i) => (
                      <div className="col-md-6 mb-3" key={`caption-${i}`}>
                        <div className="small mb-1 opacity-50">Caption for Image {i + 1}</div>
                        <input
                          type="text"
                          className="admin-input py-1"
                          placeholder="Enter caption..."
                          value={val}
                          onChange={(e) =>
                            setCaptions((prev) => prev.map((c, idx) => (idx === i ? e.target.value : c)))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer px-0 pb-0 pt-3">
              <button
                className="thm-btn cancel-btn"
                onClick={() => setUploadModalOpen(false)}
              >
                Cancel
              </button>
              <button className="thm-btn" onClick={startUpload} disabled={uploading}>
                {uploading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span> Uploading...
                  </>
                ) : (
                  "Start Upload Process"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && editTarget && (
        <div className="admin-modal-overlay" style={{ display: "flex" }} onClick={() => setEditModalOpen(false)}>
          <div className="admin-modal" style={{ maxWidth: 500, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h5 className="admin-modal-title">
                <Pencil size={18} className="me-2 text-warning" style={ICON_STYLE} /> Edit Asset Caption
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setEditModalOpen(false)} aria-label="Close"></button>
            </div>
            <div>
              <div className="text-center mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editPreviewSrc}
                  className="rounded mb-2"
                  alt=""
                  style={{ maxHeight: 180, width: "100%", objectFit: "cover", border: "1px solid rgba(224,194,20,0.2)" }}
                />
                <div style={{ position: "relative" }}>
                  <label className="thm-btn py-1 px-3" style={{ fontSize: "0.75rem", cursor: "pointer", display: "inline-block" }}>
                    <Camera size={14} className="me-1" style={ICON_STYLE} /> Replace Image
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      ref={editFileInputRef}
                      onChange={(e) => handleEditFileChange(e.target.files?.[0] || null)}
                    />
                  </label>
                  <div className="small text-muted mt-1">
                    {editReplaceFile ? `Replace with: ${editReplaceFile.name}` : ""}
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <label className="admin-form-label">Image Description</label>
                <textarea
                  className="admin-input"
                  rows={4}
                  placeholder="Brief description of this moment..."
                  value={editCaptionText}
                  onChange={(e) => setEditCaptionText(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer px-0 pb-0 pt-3">
              <button
                className="thm-btn cancel-btn"
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </button>
              <button className="thm-btn" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
