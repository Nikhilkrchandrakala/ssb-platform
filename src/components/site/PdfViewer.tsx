"use client";

import { useEffect, useRef, useState } from "react";
import { BiChevronLeft, BiChevronRight, BiZoomIn, BiZoomOut, BiReset } from "react-icons/bi";

type PdfjsLib = NonNullable<Window["pdfjsLib"]>;

export default function PdfViewer({ url }: { url: string; title?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<import("@/global").PdfJsDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [aspect, setAspect] = useState(0.707);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    // Resets viewer state whenever `url` changes, ahead of the async pdf.js load below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setProgress("Loading reader library...");
    setPdfDoc(null);
    setCurrentPage(1);
    setZoomLevel(1.0);

    const loadPdfJS = async () => {
      if (window.pdfjsLib) return window.pdfjsLib;

      return new Promise<PdfjsLib>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.async = true;
        script.onload = () => {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            resolve(window.pdfjsLib);
          } else {
            reject(new Error("PDF.js library loaded but pdfjsLib global not found"));
          }
        };
        script.onerror = () => reject(new Error("Failed to load PDF viewer library"));
        document.body.appendChild(script);
      });
    };

    const loadPdf = async () => {
      try {
        const pdfjs = await loadPdfJS();
        if (!isMounted) return;

        setProgress("Fetching document...");
        const loadingTask = pdfjs.getDocument({ url, withCredentials: false });
        const pdf = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);

        const page1 = await pdf.getPage(1);
        const viewport1 = page1.getViewport({ scale: 1.0 });
        if (isMounted) {
          const extractedAspect = viewport1.width / viewport1.height;
          if (extractedAspect && !isNaN(extractedAspect) && isFinite(extractedAspect)) {
            setAspect(extractedAspect);
          }
        }

        setLoading(false);
        setProgress("");
      } catch (err) {
        console.error("Error fetching PDF:", err);
        if (isMounted) {
          setError("Failed to load PDF. Direct download is disabled, please read online.");
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [url]);

  useEffect(() => {
    if (!pdfDoc || !viewportRef.current || loading) return;

    const viewportContainer = viewportRef.current;
    const placeholders = viewportContainer.querySelectorAll<HTMLDivElement>(".pdf-page-placeholder");

    const renderPageCanvas = async (pageNum: number, wrapper: HTMLDivElement) => {
      if (wrapper.querySelector("canvas")) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = document.createElement("canvas");
        canvas.className = "pdf-page-canvas";
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.display = "block";
        canvas.oncontextmenu = (e) => e.preventDefault();

        wrapper.appendChild(canvas);

        const context = canvas.getContext("2d");
        if (!context) return;
        const renderScale = 1.5 * zoomLevel;
        const viewport = page.getViewport({ scale: renderScale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;

        const loader = wrapper.querySelector<HTMLElement>(".pdf-page-loading-indicator");
        if (loader) {
          loader.style.opacity = "0";
          setTimeout(() => {
            loader.style.display = "none";
          }, 200);
        }
      } catch (err) {
        console.error("Error rendering page:", pageNum, err);
      }
    };

    const clearPageCanvas = (wrapper: HTMLDivElement) => {
      const canvas = wrapper.querySelector("canvas");
      if (canvas) {
        canvas.remove();
        const loader = wrapper.querySelector<HTMLElement>(".pdf-page-loading-indicator");
        if (loader) {
          loader.style.display = "flex";
          loader.style.opacity = "1";
        }
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = parseInt(entry.target.getAttribute("data-page-number") || "0", 10);
          if (entry.isIntersecting) {
            renderPageCanvas(pageNum, entry.target as HTMLDivElement);
          } else {
            clearPageCanvas(entry.target as HTMLDivElement);
          }
        });
      },
      { rootMargin: "300px 0px 300px 0px", threshold: 0.01 }
    );

    placeholders.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pdfDoc, zoomLevel, loading]);

  const handleScroll = () => {
    if (!viewportRef.current) return;
    const container = viewportRef.current;
    const containerCenter = container.scrollTop + container.clientHeight / 2;

    const placeholders = container.querySelectorAll<HTMLDivElement>(".pdf-page-placeholder");
    let currentVisiblePage = 1;

    for (const el of placeholders) {
      const pageNum = parseInt(el.getAttribute("data-page-number") || "0", 10);
      const elTop = el.offsetTop;
      const elBottom = elTop + el.clientHeight;

      if (containerCenter >= elTop && containerCenter <= elBottom) {
        currentVisiblePage = pageNum;
        break;
      }
    }

    setCurrentPage(currentVisiblePage);
  };

  const scrollToPage = (pageNum: number) => {
    if (!viewportRef.current) return;
    const container = viewportRef.current;
    const placeholder = container.querySelector<HTMLDivElement>(`.pdf-page-placeholder[data-page-number="${pageNum}"]`);
    if (placeholder) {
      container.scrollTo({ top: placeholder.offsetTop - 10, behavior: "smooth" });
    }
  };

  const handlePrevPage = () => currentPage > 1 && scrollToPage(currentPage - 1);
  const handleNextPage = () => currentPage < totalPages && scrollToPage(currentPage + 1);
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleZoomReset = () => setZoomLevel(1.0);

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const aspectValue = aspect && !isNaN(aspect) && isFinite(aspect) ? aspect : 0.707;

  return (
    <div className="pdf-js-viewer-container" ref={containerRef}>
      {loading && (
        <div className="pdf-loading-overlay">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="pdf-progress-text">{progress}</p>
        </div>
      )}

      {error && (
        <div className="pdf-error-overlay">
          <div className="pdf-error-icon">⚠️</div>
          <p className="pdf-error-text">{error}</p>
        </div>
      )}

      <div className="pdf-viewport-pane" ref={viewportRef} onScroll={handleScroll}>
        {!loading &&
          !error &&
          pageNumbers.map((pageNum) => (
            <div
              key={pageNum}
              className="pdf-page-placeholder"
              data-page-number={pageNum}
              style={{
                aspectRatio: `${aspectValue}`,
                width: "100%",
                maxWidth: `${850 * zoomLevel}px`,
                margin: "20px auto",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
                backgroundColor: "#1c1c1f",
                borderRadius: "6px",
                position: "relative",
                overflow: "hidden",
                flexShrink: 0,
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
            >
              <div className="pdf-page-loading-indicator">
                <div className="spinner-border spinner-border-sm" role="status"></div>
                <span className="pdf-loading-subtext">Loading Page {pageNum}...</span>
              </div>
            </div>
          ))}
      </div>

      {!loading && !error && (
        <div className="pdf-reader-toolbar">
          <div className="pdf-toolbar-group">
            <button className="pdf-toolbar-btn" onClick={handlePrevPage} disabled={currentPage <= 1} title="Previous Page">
              <BiChevronLeft size={22} />
            </button>
            <span className="pdf-page-display">
              Page {currentPage} of {totalPages}
            </span>
            <button className="pdf-toolbar-btn" onClick={handleNextPage} disabled={currentPage >= totalPages} title="Next Page">
              <BiChevronRight size={22} />
            </button>
          </div>

          <div className="pdf-toolbar-divider"></div>

          <div className="pdf-toolbar-group">
            <button className="pdf-toolbar-btn" onClick={handleZoomOut} disabled={zoomLevel <= 0.75} title="Zoom Out">
              <BiZoomOut size={20} />
            </button>
            <span className="pdf-zoom-display">{Math.round(zoomLevel * 100)}%</span>
            <button className="pdf-toolbar-btn" onClick={handleZoomIn} disabled={zoomLevel >= 2.5} title="Zoom In">
              <BiZoomIn size={20} />
            </button>
            <button className="pdf-toolbar-btn" onClick={handleZoomReset} title="Reset / Fit Screen">
              <BiReset size={18} />
            </button>
          </div>
        </div>
      )}

      <style>{`
                .pdf-js-viewer-container { display: flex; flex-direction: column; height: 100%; width: 100%; position: relative; background-color: #0c0c0e; overflow: hidden; }
                .pdf-viewport-pane { flex: 1; overflow-x: auto; overflow-y: auto; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 20px 10px 90px 10px; background-color: #141416; scrollbar-width: thin; scrollbar-color: #2a2a2d #141416; -webkit-overflow-scrolling: touch; }
                .pdf-viewport-pane::-webkit-scrollbar { width: 6px; height: 6px; }
                .pdf-viewport-pane::-webkit-scrollbar-track { background: #141416; }
                .pdf-viewport-pane::-webkit-scrollbar-thumb { background: #2a2a2d; border-radius: 4px; }
                .pdf-viewport-pane::-webkit-scrollbar-thumb:hover { background: #ffd700; }
                .pdf-loading-overlay, .pdf-error-overlay { display: flex; flex-direction: column; align-items: center; justify-content: center; position: absolute; inset: 0; background-color: #141416; z-index: 10; color: #ffd700; gap: 16px; }
                .pdf-loading-overlay .spinner-border { width: 2.5rem; height: 2.5rem; border-width: 0.25em; }
                .pdf-progress-text { margin: 0; font-size: 0.95rem; font-weight: 600; letter-spacing: 0.5px; }
                .pdf-error-overlay { color: #ff4d4d; padding: 20px; text-align: center; }
                .pdf-error-icon { font-size: 32px; margin-bottom: 8px; }
                .pdf-error-text { margin: 0; font-size: 1rem; font-weight: 600; }
                .pdf-page-placeholder { user-select: none !important; -webkit-user-select: none !important; -webkit-touch-callout: none; touch-action: pan-x pan-y; transition: max-width 0.15s ease; }
                .pdf-page-loading-indicator { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center; gap: 10px; color: #ffd700; z-index: 2; transition: opacity 0.25s ease; }
                .pdf-page-loading-indicator .spinner-border { color: #ffd700; }
                .pdf-loading-subtext { font-size: 0.8rem; color: rgba(255, 255, 255, 0.45); font-weight: 500; letter-spacing: 0.5px; }
                .pdf-reader-toolbar { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 12px; background: rgba(15, 15, 18, 0.92); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 30px; padding: 6px 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05); z-index: 100; max-width: 95%; width: auto; white-space: nowrap; }
                .pdf-toolbar-group { display: flex; align-items: center; gap: 6px; }
                .pdf-toolbar-btn { background: transparent; border: none; color: #e0ece0; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); outline: none; }
                .pdf-toolbar-btn:hover:not(:disabled) { background: rgba(210, 161, 0, 0.18); color: #ffd700; }
                .pdf-toolbar-btn:disabled { opacity: 0.25; cursor: not-allowed; }
                .pdf-page-display, .pdf-zoom-display { color: #f0ece0; font-size: 0.85rem; font-weight: 600; min-width: 80px; text-align: center; letter-spacing: 0.5px; }
                .pdf-zoom-display { min-width: 48px; }
                .pdf-toolbar-divider { height: 18px; width: 1px; background: rgba(255, 255, 255, 0.12); }
                @media (max-width: 600px) {
                    .pdf-reader-toolbar { padding: 4px 10px; bottom: 16px; gap: 6px; }
                    .pdf-page-display { font-size: 0.78rem; min-width: 72px; }
                    .pdf-zoom-display { font-size: 0.78rem; min-width: 38px; }
                    .pdf-toolbar-btn { width: 28px; height: 28px; }
                    .pdf-viewport-pane { padding: 10px 5px 80px 5px; }
                }
            `}</style>
    </div>
  );
}
