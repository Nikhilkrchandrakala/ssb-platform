"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CustomHeader from "@/components/site/CustomHeader";
import CustomButton from "@/components/site/CustomButton";
import EnquiryForm from "@/components/site/EnquiryForm";
import PdfViewer from "@/components/site/PdfViewer";
import { useSiteUser } from "@/components/site/SiteUserProvider";
import { postJSON } from "@/lib/authApi";
import { BiX, BiEdit, BiFullscreen } from "react-icons/bi";
import { resolveLegacyAssetUrl } from "@/lib/legacyAssets";
import { isSignedUpSiteUser } from "@/lib/siteAccess";

interface MagazineItem {
  _id: string;
  pdfTitle: string;
  // Omitted by /api/allMagazinePdfs for visitors who aren't a genuine
  // signed-up account yet — see that route for why.
  pdfFilePath?: string;
  magazineFrontImage: string;
  uploadDate?: string;
  tags: string;
}

interface ViewingPdf {
  id: string;
  url: string;
  title: string;
}

const headerData = {
  heading: "Roger That - Our monthly magazine",
  text: "Our monthly magazine Roger That is your go- to resource for in-depth insights, real - world perspectives, and expert analysis tailored to the Services Selection Board (SSB) process. Curated with a strong focus on current affairs, the magazine features probable Group Discussion and Lecturette topics, helping aspirants stay informed, articulate, and assessment - ready",
  banner: "/assets/website/rogerthat_banner.webp",
};

const DEFAULT_CATEGORIES = ["Magazine", "Books", "SSBPrep"];
const ITEMS_PER_PAGE = 8;

export default function MagazineView() {
  const router = useRouter();
  const { user } = useSiteUser();
  // A quick-join lead (src/app/api/quickJoin) already has a session cookie
  // before ever proving they own their email or paying anything — `!!user`
  // alone would let that fake-email session unlock the magazine. Require an
  // actual signed-up/paid account instead (see src/lib/siteAccess.ts).
  const signedUp = isSignedUpSiteUser(user);

  const [allMagazineData, setAllMagazineData] = useState<MagazineItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedTag, setSelectedTag] = useState("all");
  const [viewingPdf, setViewingPdf] = useState<ViewingPdf | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/allMagazinePdfs")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: MagazineItem[]) => {
        if (!cancelled) {
          setAllMagazineData(Array.isArray(data) ? data : []);
          setIsLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (viewingPdf) {
      const savedNote = localStorage.getItem(`resource_note_${viewingPdf.id}`) || "";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNoteText(savedNote);
    } else {
      setNoteText("");
    }
  }, [viewingPdf]);

  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!(document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!modalContainerRef.current) return;
    const el = modalContainerRef.current as HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> };
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };

    if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        req.call(el)?.catch?.((err: unknown) => {
          console.error("Fullscreen request failed", err);
        });
      }
    } else {
      const exit = document.exitFullscreen || doc.webkitExitFullscreen;
      if (exit) {
        exit.call(document);
      }
    }
  };

  const filteredMagazines = isLoaded
    ? [...(selectedTag === "all" ? allMagazineData : allMagazineData.filter((item) => item?.tags === selectedTag))].sort(
        (a, b) => new Date(b?.uploadDate || 0).getTime() - new Date(a?.uploadDate || 0).getTime()
      )
    : [];

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [selectedTag]);

  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentMagazines = filteredMagazines.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMagazines.length / ITEMS_PER_PAGE);

  const uniqueCategories = isLoaded
    ? Array.from(new Set([...DEFAULT_CATEGORIES, ...allMagazineData.map((item) => item?.tags).filter(Boolean)]))
    : DEFAULT_CATEGORIES;

  // View PDF — gated on being signed in, same as legacy. New uploads through
  // /api/addMagazinePdf go straight to local disk and are already full
  // public URLs, but the 84 pre-migration records still store a bare legacy
  // disk path (confirmed via Atlas query) — resolveLegacyAssetUrl() covers both.
  const viewPdf = useCallback(
    (item: MagazineItem) => {
      if (!signedUp || !item.pdfFilePath) {
        router.push(user ? "/SignUp" : "/SignIn");
        return;
      }

      setViewingPdf({ id: item._id, url: resolveLegacyAssetUrl(item.pdfFilePath), title: item.pdfTitle || "Resource" });

      if (item._id) {
        postJSON("/api/trackDownload", { magazineId: item._id }).catch(() => {});
      }
    },
    [user, signedUp, router]
  );

  const downloadNotes = (title: string, text: string) => {
    const element = document.createElement("a");
    const file = new Blob([text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/\s+/g, "_")}_Notes.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <>
      <CustomHeader heading={headerData.heading} text={headerData.text} textTwo="" banner={headerData.banner} />

      <section className="container sectionspace80">
        <div className="row justify-content-center">
          <div className="">
            <p className="magazine-intro-text">
              Roger That Magazine is a curated current affairs and perspective platform created to support aspirants
              preparing for the Services Selection Board (SSB) interview. One of the most important aspects of the
              SSB selection process is the ability to demonstrate awareness of global developments, clarity of
              thought, and the ability to articulate informed opinions during group discussions, lecturette and
              personal interviews. Roger That is your go-to resource for in-depth insights, real-world perspectives
              and expert analysis tailored to the SSB process.
            </p>
            <br />

            <p className="magazine-intro-text">
              Our monthly magazine brings together insights on global news, geopolitics, defence developments, social
              issues, technology, and leadership, helping candidates build a deeper understanding of the world around
              them. By engaging with diverse perspectives and analytical viewpoints, aspirants can develop the
              intellectual awareness and balanced thinking expected from future officers in the Armed Forces.
            </p>

            <div className="mvk-benefits">
              <h3>
                {" "}
                Through carefully selected articles, opinion pieces, and discussions on contemporary issues, Roger
                That magazine helps candidates:
              </h3>

              <ul>
                <li>Stay updated with important global and national developments</li>
                <li>Prepare on the latest GD topics</li>
                <li>Improve confidence and clarity during SSB group discussions</li>
                <li>Build informed viewpoints on current affairs</li>
                <li>Develop the ability to analyze complex situations</li>
                <li>Express balanced opinions during SSB personal interview</li>
                <li>Sharpen knowledge areas on latest lecturette topics</li>
                <li>Speak on the lecturette topics with clarity during GTO tasks</li>
                <li>Strengthen overall SSB interview preparation</li>
              </ul>
            </div>

            <p className="magazine-intro-text mt-5">
              Whether you are preparing for NDA, CDS, AFCAT, TES, or other defence entry schemes, staying informed
              about the world and developing thoughtful perspectives can significantly enhance your presence during
              group discussions, lecturettes, and personal interviews at the SSB.
            </p>

            <p className="magazine-intro-text">
              Roger That Magazine aims to become a knowledge companion for defence aspirants, helping them cultivate
              awareness, perspective, and intellectual curiosity—qualities that are essential for leadership in the
              Armed Forces.
            </p>
          </div>
        </div>

        <div className="row align-items-center justify-content-between g-3 mt-5">
          {!signedUp && (
            <div className="col-12 col-md-8">
              <p className="d-flex justify-content-start m-0 downloadYourRes">
                <span onClick={() => router.push("/SignUp")}> Sign up</span> to download your free magazine.
              </p>
            </div>
          )}

          <div className="col-12 col-md-4 text-md-end">
            <form>
              <div className="form-group">
                <select
                  className="form-select thm-select w-100 w-md-auto"
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                >
                  <option value="all">All Resources</option>
                  {uniqueCategories.map((cat) => {
                    let displayName = cat;
                    if (cat === "Magazine") displayName = "Current Affairs Magazine";
                    else if (cat === "Books") displayName = "Books";
                    else if (cat === "SSBPrep") displayName = "SSB Prep Material";
                    return (
                      <option key={cat} value={cat}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
              </div>
            </form>
          </div>
        </div>

        <div style={{ marginTop: "0" }} className="col-12 mx-auto row g-4">
          {currentMagazines?.map((item, index) => (
            <div className="col-lg-3 col-md-4 col-6" key={item._id || index}>
              <div className="card magazine-card mt-4">
                <div className="magazine-hover">
                  <CustomButton text="Read Online" onClick={() => viewPdf(item)} />
                </div>

                <div className="card-header magazine-card-head">
                  <div className="card-title magazine-card-title">{item?.pdfTitle}</div>
                </div>

                <div className="card-body magazine-card-body">
                  <img
                    src={item?.magazineFrontImage ? resolveLegacyAssetUrl(item.magazineFrontImage) : undefined}
                    className="magazine-card-img"
                    alt="Magazine Image"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="pdf-pagination-container">
            <button
              className="pdf-pagination-btn"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                className={`pdf-pagination-btn ${currentPage === pageNum ? "active" : ""}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}
            <button
              className="pdf-pagination-btn"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </section>

      <EnquiryForm />

      {/* PDF Resource Viewer Modal */}
      {viewingPdf && (
        <div
          className="pdf-modal-overlay"
          onClick={() => {
            setViewingPdf(null);
            setShowNotes(false);
          }}
        >
          <div className="pdf-modal-container" ref={modalContainerRef} onClick={(e) => e.stopPropagation()}>
            <div className="pdf-modal-header">
              <h3>{viewingPdf.title}</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className={`pdf-modal-notes-toggle ${isFullscreen ? "active" : ""}`}
                  onClick={toggleFullscreen}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <BiFullscreen /> <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                </button>
                <button
                  className={`pdf-modal-notes-toggle ${showNotes ? "active" : ""}`}
                  onClick={() => setShowNotes(!showNotes)}
                >
                  <BiEdit /> <span>{showNotes ? "Hide Notes" : "Take Notes"}</span>
                </button>
                <button
                  className="pdf-modal-close-btn"
                  onClick={() => {
                    setViewingPdf(null);
                    setShowNotes(false);
                  }}
                >
                  <BiX /> <span>Close</span>
                </button>
              </div>
            </div>
            <div className="pdf-modal-body">
              <div className="pdf-modal-viewer-split">
                <div className="pdf-viewer-pane">
                  <PdfViewer url={viewingPdf.url} title={viewingPdf.title} />
                </div>
                {showNotes && (
                  <div className="pdf-notes-pane">
                    <div className="pdf-notes-header">
                      <h4>Notes</h4>
                      <span className="pdf-notes-status-badge">Auto-saved</span>
                    </div>
                    <textarea
                      placeholder="Write your notes here... They will be automatically saved locally."
                      value={noteText}
                      onChange={(e) => {
                        setNoteText(e.target.value);
                        localStorage.setItem(`resource_note_${viewingPdf.id}`, e.target.value);
                      }}
                    />
                    <div className="pdf-notes-footer">
                      <button className="notes-btn-download" onClick={() => downloadNotes(viewingPdf.title, noteText)}>
                        Download .txt
                      </button>
                      <button
                        className="notes-btn-clear"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to clear these notes?")) {
                            setNoteText("");
                            localStorage.removeItem(`resource_note_${viewingPdf.id}`);
                          }
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
