"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  PlusCircle,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Upload,
  Plus,
} from "lucide-react";
import "@/app/admin/styles/legacy-magazine.css";
import { resolveLegacyAssetUrl } from "@/lib/legacyAssets";

const ICON_STYLE = { verticalAlign: -2 };

interface MagazinePdf {
  _id: string;
  pdfTitle: string;
  pdfFilePath: string;
  magazineFrontImage: string;
  tags: string;
  uploadDate?: string;
}

const DEFAULT_CATEGORIES = ["Magazine", "Books", "SSBPrep"];

const COVER_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMDAgNDAwIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzFlMWUxZSIvPjxyZWN0IHg9IjE1IiB5PSIxNSIgd2lkdGg9IjI3MCIgaGVpZ2h0PSIzNzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UwYzIxNCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtZGFzaGFycmF5PSI0IDQiIG9wYWNpdHk9IjAuNCIvPjxwYXRoIGQ9Ik0xMTAgMTMwIGg4MCB2MTEwIGgtODAgeiBNMTMwIDEzMCB2MTEwIiBmaWxsPSJub25lIiBzdHJva2U9IiNlMGMyMTQiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjx0ZXh0IHg9IjE1MCIgeT0iMjg1IiBmaWxsPSIjZTBjMjE0IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNSIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIxLjUiPlNTQiBESUdJVEFMPC90ZXh0Pjx0ZXh0IHg9IjE1MCIgeT0iMzE1IiBmaWxsPSIjODg4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9IjAuNSI+Q09WRVIgTk9UIEZPVU5EPC90ZXh0Pjwvc3ZnPg==";

export default function MagazineView() {
  const [magazines, setMagazines] = useState<MagazinePdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [magTitle, setMagTitle] = useState("");
  const [magCategory, setMagCategory] = useState("Magazine");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const loadCategoriesList = (fetched: MagazinePdf[] = []) => {
    let cats = [...DEFAULT_CATEGORIES];
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("library_categories") : null;
    if (stored) {
      try {
        cats = JSON.parse(stored);
      } catch {
        cats = [...DEFAULT_CATEGORIES];
      }
    }
    if (fetched.length > 0) {
      const fetchedTags = fetched.map((m) => m.tags).filter(Boolean);
      cats = Array.from(new Set([...cats, ...fetchedTags]));
    }
    DEFAULT_CATEGORIES.forEach((d) => {
      if (!cats.includes(d)) cats.push(d);
    });
    if (typeof window !== "undefined") window.localStorage.setItem("library_categories", JSON.stringify(cats));
    setCategories(cats);
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/allMagazinePdfs")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch library data");
        return res.json();
      })
      .then((data: MagazinePdf[]) => {
        if (cancelled) return;
        loadCategoriesList(data);
        const sorted = [...data].sort(
          (a, b) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime()
        );
        setMagazines(sorted);
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
    fetch("/api/allMagazinePdfs")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch library data");
        return res.json();
      })
      .then((data: MagazinePdf[]) => {
        loadCategoriesList(data);
        const sorted = [...data].sort(
          (a, b) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime()
        );
        setMagazines(sorted);
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

  const addCategory = async () => {
    const result = await window.Swal?.fire({
      title: "Add New Category",
      input: "text",
      inputLabel: "Category Name",
      inputPlaceholder: "e.g. Current Affairs, Interview Prep",
      showCancelButton: true,
      background: "#1a1a1a",
      color: "#fff",
      confirmButtonColor: "#d2a100",
      cancelButtonColor: "rgba(255,255,255,0.1)",
      inputValidator: (value: string) => {
        if (!value || !value.trim()) return "You need to write something!";
        if (categories.includes(value.trim())) return "Category already exists!";
        return undefined;
      },
    });
    const newCat = result?.value as string | undefined;

    if (newCat) {
      const trimmed = newCat.trim();
      const next = [...categories, trimmed];
      setCategories(next);
      window.localStorage.setItem("library_categories", JSON.stringify(next));
      setMagCategory(trimmed);
      window.Swal?.fire({
        icon: "success",
        title: "Added",
        text: `Category "${trimmed}" added successfully.`,
        background: "#1a1a1a",
        color: "#fff",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const removeCategory = async () => {
    const selected = magCategory;
    if (DEFAULT_CATEGORIES.includes(selected)) {
      window.Swal?.fire({
        icon: "error",
        title: "Cannot Delete",
        text: `Default category "${selected}" cannot be deleted.`,
        background: "#1a1a1a",
        color: "#fff",
      });
      return;
    }

    const result = await window.Swal?.fire({
      title: "Remove Category?",
      text: `Are you sure you want to remove the category "${selected}" from the list?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff6b6b",
      cancelButtonColor: "rgba(255,255,255,0.1)",
      confirmButtonText: "Yes, remove it",
      background: "#1a1a1a",
      color: "#fff",
    });

    if (result?.isConfirmed) {
      const next = categories.filter((c) => c !== selected);
      setCategories(next);
      window.localStorage.setItem("library_categories", JSON.stringify(next));
      setMagCategory("Magazine");
      window.Swal?.fire({
        icon: "success",
        title: "Removed",
        text: "Category removed.",
        background: "#1a1a1a",
        color: "#fff",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const openAddModal = () => {
    setEditId(null);
    setMagTitle("");
    setMagCategory("Magazine");
    if (pdfInputRef.current) pdfInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    setModalOpen(true);
  };

  const openEditModal = (mag: MagazinePdf) => {
    setEditId(mag._id);
    setMagTitle(mag.pdfTitle);
    setMagCategory(mag.tags || "Magazine");
    if (pdfInputRef.current) pdfInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    setModalOpen(true);
  };

  const saveMag = async () => {
    const title = magTitle.trim();
    const pdfFile = pdfInputRef.current?.files?.[0];
    const imgFile = imageInputRef.current?.files?.[0];

    if (!title || (!editId && (!pdfFile || !imgFile))) {
      window.Swal?.fire({
        icon: "warning",
        title: "Missing Info",
        text: "Please fill all required fields.",
        background: "#1a1a1a",
        color: "#fff",
      });
      return;
    }

    const formData = new FormData();
    formData.append("pdfTitle", title);
    formData.append("tags", magCategory);
    if (pdfFile) formData.append("magazinePdf", pdfFile);
    if (imgFile) formData.append("magazineFrontImage", imgFile);

    try {
      setSaving(true);
      const url = editId ? `/api/updateMagazinePdf/${editId}` : "/api/addMagazinePdf";
      const method = editId ? "PUT" : "POST";
      const response = await fetch(url, { method, body: formData });
      if (!response.ok) throw new Error("Action failed");

      window.Swal?.fire({
        icon: "success",
        title: editId ? "Updated" : "Published",
        text: "Document library has been synchronized.",
        background: "#1a1a1a",
        color: "#fff",
      });
      setModalOpen(false);
      reload();
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Process Failed",
        text: err instanceof Error ? err.message : "Error",
        background: "#1a1a1a",
        color: "#fff",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id: string) => {
    const result = await window.Swal?.fire({
      title: "Delete Asset?",
      text: "This document will be removed from the library permanently.",
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
      const response = await fetch(`/api/deleteMagazinePdf/${id}`, { method: "DELETE" });
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

  const filteredMagazines = magazines.filter((mag) => {
    const matchesCategory = filterCategory === "All" || (mag.tags || "Magazine") === filterCategory;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || mag.pdfTitle.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="container" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 20px" }}>
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <BookOpen size={20} className="me-2" style={ICON_STYLE} /> Digital Library
          </h1>
          <p className="text-muted mb-0">Publish and organize magazines, books, and study materials</p>
        </div>
        <button className="thm-btn" onClick={openAddModal}>
          <PlusCircle size={16} className="me-2" style={ICON_STYLE} /> Publish New
        </button>
      </div>

      {!loading && magazines.length > 0 && (
        <div className="d-flex flex-wrap gap-3 align-items-center mb-4">
          <div style={{ position: "relative", maxWidth: 320, width: "100%" }}>
            <Search
              size={16}
              style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
            />
            <input
              type="text"
              className="admin-input"
              placeholder="Search by title..."
              style={{ paddingLeft: 45, borderRadius: 20 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="admin-input form-select"
            style={{ maxWidth: 220 }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option value={cat} key={cat}>
                {cat}
              </option>
            ))}
          </select>
          <span className="text-muted small">
            Showing {filteredMagazines.length} of {magazines.length}
          </span>
        </div>
      )}

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-warning" role="status"></div>
          <p className="mt-3 opacity-50">Opening the archives...</p>
        </div>
      )}

      {!loading && magazines.length === 0 && (
        <div className="text-center py-5">
          <BookOpen size={64} className="mb-3" style={{ opacity: 0.2 }} />
          <h3>The library is empty</h3>
          <p className="text-muted">Start by publishing your first magazine or study guide.</p>
          <button className="thm-btn mt-3" onClick={openAddModal}>
            Publish Now
          </button>
        </div>
      )}

      {!loading && magazines.length > 0 && filteredMagazines.length === 0 && (
        <div className="text-center py-5">
          <Filter size={64} className="mb-3" style={{ opacity: 0.2 }} />
          <h3>No matches</h3>
          <p className="text-muted">No items match your search/category filter.</p>
        </div>
      )}

      {!loading && filteredMagazines.length > 0 && (
        <div className="magazine-grid">
          {filteredMagazines.map((mag) => (
            <div className="magazine-card" key={mag._id}>
              <div className="cover-wrapper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveLegacyAssetUrl(mag.magazineFrontImage)}
                  className="cover-img"
                  alt="Cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = COVER_PLACEHOLDER;
                  }}
                />
              </div>
              <div className="magazine-details">
                <span className="mag-tag">{mag.tags || "Magazine"}</span>
                <div className="mag-title">{mag.pdfTitle}</div>
                <div className="mag-actions">
                  <a
                    href={resolveLegacyAssetUrl(mag.pdfFilePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mag-btn"
                    title="View PDF"
                  >
                    <Eye size={14} style={ICON_STYLE} /> View
                  </a>
                  <button className="mag-btn" onClick={() => openEditModal(mag)} title="Edit Metadata">
                    <Pencil size={14} style={ICON_STYLE} /> Edit
                  </button>
                  <button className="mag-btn del" onClick={() => confirmDelete(mag._id)} title="Remove Asset">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="admin-modal-overlay" style={{ display: "flex" }} onClick={() => setModalOpen(false)}>
          <div className="admin-modal" style={{ maxWidth: 600, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h5 className="admin-modal-title">
                {editId ? (
                  <Pencil size={18} className="me-2 text-warning" style={ICON_STYLE} />
                ) : (
                  <Upload size={18} className="me-2 text-warning" style={ICON_STYLE} />
                )}{" "}
                {editId ? "Edit Metadata" : "Publish Asset"}
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setModalOpen(false)} aria-label="Close"></button>
            </div>
            <div>
              <div className="row">
                <div className="col-md-7 mb-3">
                  <label className="admin-form-label">Asset Title *</label>
                  <input
                    type="text"
                    className="admin-input"
                    required
                    placeholder="e.g. SSB Monthly May 2024"
                    value={magTitle}
                    onChange={(e) => setMagTitle(e.target.value)}
                  />
                </div>
                <div className="col-md-5 mb-3">
                  <label className="admin-form-label">Category *</label>
                  <div className="input-group">
                    <select
                      className="admin-input form-select"
                      required
                      style={{
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0,
                        backgroundColor: "var(--surface-light)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                      value={magCategory}
                      onChange={(e) => setMagCategory(e.target.value)}
                    >
                      {categories.map((cat) => (
                        <option value={cat} key={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-outline-warning"
                      type="button"
                      title="Add New Category"
                      style={{ borderRadius: 0 }}
                      onClick={addCategory}
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      type="button"
                      title="Remove Selected Category"
                      style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                      onClick={removeCategory}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="admin-form-label">
                    Document File (PDF) {editId ? <span className="text-muted" style={{ fontSize: "0.8rem", fontWeight: "normal" }}> (Optional)</span> : "*"}
                  </label>
                  <input type="file" className="admin-input" accept="application/pdf" ref={pdfInputRef} />
                  {editId && <div className="small opacity-50 mt-1">Leave empty to keep existing file.</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="admin-form-label">
                    Cover Image (Portrait) {editId ? <span className="text-muted" style={{ fontSize: "0.8rem", fontWeight: "normal" }}> (Optional)</span> : "*"}
                  </label>
                  <input type="file" className="admin-input" accept="image/*" ref={imageInputRef} />
                  {editId && <div className="small opacity-50 mt-1">Leave empty to keep existing cover.</div>}
                </div>
              </div>
            </div>
            <div className="modal-footer px-0 pb-0 pt-3">
              <button
                className="thm-btn cancel-btn"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button className="thm-btn" onClick={saveMag} disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span> Processing...
                  </>
                ) : (
                  "Confirm Publication"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
