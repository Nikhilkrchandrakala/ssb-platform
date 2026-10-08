"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import olqLibraryRaw from "@/lib/data/isv-olq-library.json";
import {
  OlqLibrary,
  AnalysisResult,
  SelectionsMap,
  OLQ_KEYS_ORDER,
  analyse,
  compileReport,
  toText,
  scoresToShade,
  shadeToScores,
  formatShade,
  parseShade,
  AnalyzedOlq,
} from "@/lib/isv-olq-engine";
import { AssessmentSubmission, UserProfile } from "@/app/psych-battery/types";
import { assessorLabel } from "@/lib/assessorLabels";
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  ArrowRight,
  Send,
  Loader2,
  Check,
  FileCheck,
} from "lucide-react";
import { Button, Badge, Card, GlassCard } from "@/app/psych-battery/components/ui/Primitives";
import { cn } from "@/app/psych-battery/lib/utils";

const LIB = olqLibraryRaw as unknown as OlqLibrary;

interface RapidAssessmentEngineViewProps {
  submissionId: string;
  submission: AssessmentSubmission;
  student: UserProfile | null;
  activeAssessorType: "Psych" | "GTO" | "TO" | "IO";
  scores: Record<string, number | string>;
  setScores: React.Dispatch<React.SetStateAction<Record<string, number | string>>>;
  remarks: string;
  setRemarks: React.Dispatch<React.SetStateAction<string>>;
  isAssessorCompleted: boolean;
  saving: boolean;
  handleUploadRemarks: () => Promise<void>;
  handleUploadMarks: () => Promise<void>;
  handleUpdate: (status: AssessmentSubmission["status"]) => Promise<void>;
}

const SEVERITY_COLOR: Record<number, { bg: string; text: string; border: string }> = {
  5: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-400/40" },
  6: { bg: "bg-cyan-500/20", text: "text-cyan-300", border: "border-cyan-400/40" },
  7: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-400/40" },
  8: { bg: "bg-orange-500/20", text: "text-orange-300", border: "border-orange-400/40" },
  9: { bg: "bg-rose-500/20", text: "text-rose-300", border: "border-rose-400/40" },
};

const FACTOR_NAMES: Record<number, string> = {
  1: "FACTOR I: PLANNING & ORGANIZING",
  2: "FACTOR II: SOCIAL ADJUSTMENT",
  3: "FACTOR III: SOCIAL EFFECTIVENESS",
  4: "FACTOR IV: DYNAMIC",
};

export default function RapidAssessmentEngineView({
  submission,
  student,
  activeAssessorType,
  scores,
  setScores,
  remarks,
  setRemarks,
  isAssessorCompleted,
  saving,
  handleUploadRemarks,
  handleUploadMarks,
  handleUpdate,
}: RapidAssessmentEngineViewProps) {
  // Local state initialized from parent scores & remarks
  const initialShade = useMemo(() => scoresToShade(scores), [scores]);
  const [shadeInput, setShadeInput] = useState<string>(formatShade(initialShade));
  const [marksInput, setMarksInput] = useState<string>(
    scores.marks !== undefined && scores.marks !== null ? String(scores.marks) : ""
  );
  const [writeupText, setWriteupText] = useState<string>(remarks || "");
  const [selectedTags, setSelectedTags] = useState<Record<string, boolean>>({});
  const [selections, setSelections] = useState<SelectionsMap>({});
  const [expandedOlq, setExpandedOlq] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"intake" | "diagnosis" | "report">("diagnosis");

  // Keep writeup text updated if parent remarks change externally (unless user edited)
  useEffect(() => {
    if (remarks && !writeupText) {
      setWriteupText(remarks);
    }
  }, [remarks, writeupText]);

  // Clean shade digits
  const cleanDigits = useMemo(() => shadeInput.replace(/[^0-9]/g, ""), [shadeInput]);

  // Run ISV Analysis
  const analysis: AnalysisResult = useMemo(() => {
    const parsed = parseShade(cleanDigits);
    if (!parsed.ok) {
      return {
        ok: false,
        error: parsed.error,
        shade: cleanDigits,
        ticks: [],
        tickMap: {},
        marks: null,
        band: null,
        limitations: 0,
        factorsWithLimit: 0,
        profiles: [],
        olqs: [],
        focus: [],
        flags: [],
      };
    }
    const tagsList = Object.keys(selectedTags).filter((k) => selectedTags[k]);
    return analyse(LIB, {
      shade: cleanDigits,
      marks: marksInput ? Number(marksInput) : null,
      tags: tagsList,
      text: writeupText,
    });
  }, [cleanDigits, marksInput, selectedTags, writeupText]);

  // Auto-seed selections when analysis produces new OLQs
  useEffect(() => {
    if (!analysis.ok) return;
    setSelections((prev) => {
      const next = { ...prev };
      let changed = false;
      analysis.olqs.forEach((o) => {
        if (!next[o.id]) {
          next[o.id] = { patternIds: [], suggestionIds: [], custom: [], note: "" };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [analysis]);

  // Two-way sync: Update parent `scores` whenever shade or marks change in this engine
  const syncToParentScores = useCallback(
    (digits: string, marksVal: string) => {
      if (digits.length === 15) {
        setScores((prev) => {
          const updated = shadeToScores(digits, prev);
          if (marksVal !== "") {
            const parsedMarks = parseInt(marksVal, 10);
            if (!isNaN(parsedMarks)) {
              updated.marks = parsedMarks;
            }
          }
          return updated;
        });
      }
    },
    [setScores]
  );

  const handleShadeChange = (val: string) => {
    setShadeInput(val);
    const digits = val.replace(/[^0-9]/g, "");
    if (digits.length === 15) {
      syncToParentScores(digits, marksInput);
    }
  };

  const handleMarksChange = (val: string) => {
    setMarksInput(val);
    if (cleanDigits.length === 15) {
      syncToParentScores(cleanDigits, val);
    } else {
      setScores((prev) => {
        const next = { ...prev };
        if (val === "") {
          delete next.marks;
        } else {
          const parsed = parseInt(val, 10);
          if (!isNaN(parsed)) next.marks = parsed;
        }
        return next;
      });
    }
  };

  // Sync from Parent Scores button (in case changed in other tab)
  const handleSyncFromCurrentScores = () => {
    const parentShade = scoresToShade(scores);
    setShadeInput(formatShade(parentShade));
    const parentMarks = scores.marks !== undefined && scores.marks !== null ? String(scores.marks) : "";
    setMarksInput(parentMarks);
    syncToParentScores(parentShade, parentMarks);
  };

  // Compile full improvement plan
  const compiledReport = useMemo(() => {
    if (!analysis.ok) return null;
    return compileReport(LIB, analysis, selections, {
      name: student?.name || "Candidate",
      id: student?.chestNo ? `Chest No: ${student.chestNo}` : student?.email || "",
      date: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }),
      assessor: assessorLabel(activeAssessorType),
    });
  }, [analysis, selections, student, activeAssessorType]);

  const compiledText = useMemo(() => {
    if (!compiledReport) return "";
    return toText(compiledReport);
  }, [compiledReport]);

  // Append / Replace into Remarks state
  const handleApplyToRemarks = (mode: "append" | "replace") => {
    if (!compiledText) return;
    if (mode === "append") {
      const divider = `\n\n═══════════════════════════════════════════════\n${assessorLabel(activeAssessorType).toUpperCase()} — ISV PERSONAL IMPROVEMENT PLAN\n═══════════════════════════════════════════════\n`;
      const nextRemarks = remarks.trim() ? `${remarks.trim()}${divider}${compiledText}` : compiledText;
      setRemarks(nextRemarks);
      setWriteupText(nextRemarks);
      alert("Successfully appended ISV Improvement Plan to Remarks!");
    } else {
      setRemarks(compiledText);
      setWriteupText(compiledText);
      alert("Successfully set Remarks to ISV Improvement Plan!");
    }
  };

  // Auto-Select Top 3 Steps for All Limiting OLQs (Tick >= 7)
  const handleAutoSelectTop3 = () => {
    if (!analysis.ok) return;
    setSelections((prev) => {
      const next = { ...prev };
      analysis.olqs.forEach((o) => {
        if (o.effTick >= 7) {
          const current = next[o.id] || { patternIds: [], suggestionIds: [], custom: [], note: "" };
          const pat = current.patternIds.length ? current.patternIds[0] : o.patterns[0]?.id;
          const chosenPatternObj = o.patterns.find((p) => p.id === pat) || o.patterns[0];
          const topSugIds = (chosenPatternObj?.suggestions || []).slice(0, 3).map((s) => s.id);
          next[o.id] = {
            ...current,
            patternIds: pat ? [pat] : [],
            suggestionIds: topSugIds,
          };
        }
      });
      return next;
    });
  };

  // Clear selections
  const handleClearSelections = () => {
    setSelections((prev) => {
      const next: SelectionsMap = {};
      Object.keys(prev).forEach((k) => {
        next[k] = { patternIds: [], suggestionIds: [], custom: [], note: "" };
      });
      return next;
    });
  };

  // Toggle pattern for an OLQ
  const handleTogglePattern = (olqId: string, patternId: string) => {
    setSelections((prev) => {
      const current = prev[olqId] || { patternIds: [], suggestionIds: [], custom: [], note: "" };
      const idx = current.patternIds.indexOf(patternId);
      const o = analysis.olqs.find((item) => item.id === olqId);
      let nextPats = [...current.patternIds];
      let nextSugs = [...current.suggestionIds];

      if (idx === -1) {
        if (nextPats.length >= 3) {
          alert("Maximum 3 personality types per OLQ");
          return prev;
        }
        nextPats.push(patternId);
        if (o && !nextSugs.length) {
          const patObj = o.patterns.find((p) => p.id === patternId);
          if (patObj) {
            nextSugs = patObj.suggestions.slice(0, 3).map((s) => s.id);
          }
        }
      } else {
        nextPats.splice(idx, 1);
      }

      return {
        ...prev,
        [olqId]: { ...current, patternIds: nextPats, suggestionIds: nextSugs },
      };
    });
  };

  // Toggle suggestion step for an OLQ
  const handleToggleSuggestion = (olqId: string, sugId: string) => {
    setSelections((prev) => {
      const current = prev[olqId] || { patternIds: [], suggestionIds: [], custom: [], note: "" };
      const idx = current.suggestionIds.indexOf(sugId);
      let nextSugs = [...current.suggestionIds];
      if (idx === -1) {
        nextSugs.push(sugId);
      } else {
        nextSugs = nextSugs.filter((id) => id !== sugId);
      }
      return {
        ...prev,
        [olqId]: { ...current, suggestionIds: nextSugs },
      };
    });
  };

  // Copy report to clipboard
  const handleCopyReport = () => {
    if (!compiledText) return;
    navigator.clipboard
      .writeText(compiledText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => alert("Failed to copy report"));
  };

  // Download plain text report
  const handleDownloadTxt = () => {
    if (!compiledText) return;
    const blob = new Blob([compiledText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ISV_Improvement_Plan_${student?.chestNo || student?.name || "Candidate"}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 500);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Banner & Control Bar */}
      <GlassCard className="p-4 sm:p-6 border-app-accent/30 bg-gradient-to-r from-app-card via-app-card to-app-accent/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5">
            <div className="flex items-start sm:items-center gap-3">
              <span className="p-2 rounded-xl bg-app-accent/20 border border-app-accent/40 text-app-accent shrink-0">
                <Zap size={22} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-app-text-bright tracking-tight">
                    Rapid Assessment Engine
                  </h2>
                  <Badge tone="accent">ISV OLQ v{LIB.version}</Badge>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-app-card border border-app-border text-app-text-muted">
                    {assessorLabel(activeAssessorType)}
                  </span>
                </div>
                <p className="text-xs text-app-text-muted mt-0.5 leading-relaxed">
                  Type the 15-digit shade, auto-detect personality patterns, and generate instant qualitative improvement plans.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="secondary"
              icon={RotateCcw}
              onClick={handleSyncFromCurrentScores}
              title="Reset shade and marks to match the Assessment tab"
              className="w-full sm:w-auto text-xs"
            >
              Sync from Current Scores
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={Sparkles}
              onClick={handleAutoSelectTop3}
              disabled={isAssessorCompleted || !analysis.ok}
              title="Auto-select suggested types and top 3 steps for all limiting qualities"
              className="w-full sm:w-auto text-xs"
            >
              Auto-Select Top 3 Steps
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Responsive Sub-tabs for smaller screens */}
      <div className="lg:hidden flex rounded-2xl bg-app-card border border-app-border p-1 w-full gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab("intake")}
          className={cn(
            "flex-1 py-2 px-1 text-[11px] sm:text-xs font-bold rounded-xl transition-all text-center min-h-[38px] flex items-center justify-center",
            activeSubTab === "intake" ? "bg-app-accent text-app-on-accent shadow" : "text-app-text-muted hover:text-app-text-bright"
          )}
        >
          <span className="block sm:hidden">1. Ticks</span>
          <span className="hidden sm:block">1. Quick Ticks</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("diagnosis")}
          className={cn(
            "flex-1 py-2 px-1 text-[11px] sm:text-xs font-bold rounded-xl transition-all text-center min-h-[38px] flex items-center justify-center",
            activeSubTab === "diagnosis" ? "bg-app-accent text-app-on-accent shadow" : "text-app-text-muted hover:text-app-text-bright"
          )}
        >
          <span className="block sm:hidden">2. Diagnosis ({analysis.limitations})</span>
          <span className="hidden sm:block">2. OLQ Diagnosis ({analysis.limitations} Limits)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("report")}
          className={cn(
            "flex-1 py-2 px-1 text-[11px] sm:text-xs font-bold rounded-xl transition-all text-center min-h-[38px] flex items-center justify-center",
            activeSubTab === "report" ? "bg-app-accent text-app-on-accent shadow" : "text-app-text-muted hover:text-app-text-bright"
          )}
        >
          <span className="block sm:hidden">3. Report ({compiledReport?.sections.length || 0})</span>
          <span className="hidden sm:block">3. Live Report ({compiledReport?.sections.length || 0})</span>
        </button>
      </div>

      {/* 3-Column Studio Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMN 1: Quick Intake & 15-Tick Strip (3.5 cols) */}
        <div className={cn("lg:col-span-4 space-y-6", activeSubTab !== "intake" && "hidden lg:block")}>
          <Card className="p-4 sm:p-6 space-y-5 border-app-border shadow-xl">
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-app-text-bright flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-app-accent/20 text-app-accent flex items-center justify-center text-[10px] font-black">
                  1
                </span>
                Ticks &amp; Profile Intake
              </h3>
              {cleanDigits.length === 15 && (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={12} /> 15/15 Loaded
                </span>
              )}
            </div>

            {/* 15-Digit Rapid Shade Input */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-app-text-muted flex items-center justify-between">
                <span>15 Ticks (Shade String)</span>
                <span className="text-[10px] text-app-accent font-mono">EI RA OA POE | SA COOP SOR...</span>
              </label>
              <input
                type="text"
                value={shadeInput}
                onChange={(e) => handleShadeChange(e.target.value)}
                disabled={isAssessorCompleted}
                placeholder="8787 777 88887 878"
                className="w-full bg-black/40 border border-app-border focus:border-app-accent rounded-2xl p-3.5 text-center font-mono text-xl font-black tracking-widest text-app-text-bright focus:outline-none transition-all placeholder:text-app-text-muted/30"
              />
              <p className="text-[10px] text-app-text-muted/80 leading-relaxed">
                Enter all 15 digits (spaces optional). Modifying digits updates the numeric table in the Assessment tab in real time.
              </p>
            </div>

            {/* Visual Colored 15-Tick Strip */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-app-text-muted block">
                Visual Score Strip
              </span>
              <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-5 gap-1.5 text-center">
                {OLQ_KEYS_ORDER.map((item, idx) => {
                  const digit = cleanDigits[idx];
                  const num = digit ? parseInt(digit, 10) : null;
                  const sev = num ? (num <= 5 ? 5 : num >= 9 ? 9 : num) : null;
                  const tone = sev ? SEVERITY_COLOR[sev] : { bg: "bg-app-card", text: "text-app-text-muted", border: "border-app-border" };
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "p-1.5 rounded-xl border flex flex-col items-center justify-center transition-all",
                        tone.bg,
                        tone.border
                      )}
                      title={`${item.code}: ${num !== null ? `Tick ${num}` : "Not set"}`}
                    >
                      <span className="text-[9px] font-black text-app-text-muted uppercase leading-none">{item.code}</span>
                      <span className={cn("text-sm font-black mt-0.5 leading-none", tone.text)}>
                        {num !== null ? num : "-"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Overall Marks & Band Check */}
            <div className="space-y-2 pt-2 border-t border-app-border/40">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-app-text-muted">
                  Overall Marks
                </label>
                {analysis.band && (
                  <span className="text-[10px] font-black uppercase text-app-accent tracking-wider">
                    Band: {analysis.band.code} ({analysis.band.label})
                  </span>
                )}
              </div>
              <input
                type="number"
                min={0}
                max={999}
                value={marksInput}
                onChange={(e) => handleMarksChange(e.target.value)}
                disabled={isAssessorCompleted}
                placeholder="e.g. 74 or 145"
                className="w-full bg-black/40 border border-app-border focus:border-app-accent rounded-xl p-3 text-sm font-black text-app-text-bright focus:outline-none transition-all placeholder:text-app-text-muted/30"
              />
            </div>

            {/* Guideline Flags & Advisory Alerts */}
            {analysis.flags.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                  <AlertCircle size={14} />
                  <span>Guideline Observations ({analysis.flags.length})</span>
                </div>
                <ul className="text-[11px] text-amber-200/90 space-y-1 list-disc list-inside">
                  {analysis.flags.map((flag, i) => (
                    <li key={i}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Personality Profile Tags */}
            <div className="space-y-2 pt-2 border-t border-app-border/40">
              <label className="text-[11px] font-bold uppercase tracking-wider text-app-text-muted block">
                Personality Tags (Optional Signal)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(LIB.config.profiles).map((pid) => {
                  const p = LIB.config.profiles[pid];
                  const isSelected = !!selectedTags[pid];
                  return (
                    <button
                      key={pid}
                      type="button"
                      disabled={isAssessorCompleted}
                      onClick={() =>
                        setSelectedTags((prev) => ({
                          ...prev,
                          [pid]: !prev[pid],
                        }))
                      }
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border",
                        isSelected
                          ? "bg-app-accent text-app-on-accent border-app-accent shadow-sm"
                          : "bg-app-card/60 text-app-text-muted border-app-border hover:border-app-accent/50 hover:text-app-text-bright"
                      )}
                      title={p.desc}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assessor Write-Up (Used by keyword matcher) */}
            <div className="space-y-2 pt-2 border-t border-app-border/40">
              <label className="text-[11px] font-bold uppercase tracking-wider text-app-text-muted block">
                Assessor Notes / Write-up
              </label>
              <textarea
                rows={4}
                value={writeupText}
                onChange={(e) => setWriteupText(e.target.value)}
                disabled={isAssessorCompleted}
                placeholder="Draft observations or paste Paragraph 3. Specific wording helps the engine match behavioral types..."
                className="w-full bg-black/40 border border-app-border focus:border-app-accent rounded-2xl p-3 text-xs text-app-text-bright focus:outline-none transition-all placeholder:text-app-text-muted/30 resize-y"
              />
            </div>
          </Card>
        </div>

        {/* COLUMN 2: 15 OLQ Diagnosis & Improvement Steps (5 cols) */}
        <div className={cn("lg:col-span-5 space-y-4", activeSubTab !== "diagnosis" && "hidden lg:block")}>
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-app-text-bright flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-app-accent/20 text-app-accent flex items-center justify-center text-[10px] font-black">
                2
              </span>
              OLQ Patterns &amp; Recommendations
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearSelections}
                disabled={isAssessorCompleted}
                className="text-[10px] font-bold text-app-text-muted hover:text-app-text-bright transition-colors uppercase tracking-wider"
              >
                Clear All
              </button>
            </div>
          </div>

          {!analysis.ok ? (
            <Card className="p-8 text-center text-app-text-muted text-xs">
              <AlertCircle size={28} className="mx-auto mb-2 opacity-40" />
              Please enter 15 valid numeric digits in the shade input to analyze qualities.
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Group by Factors */}
              {[1, 2, 3, 4].map((factorNum) => {
                const olqsInFactor = analysis.olqs.filter((o) => o.factor === factorNum);
                return (
                  <div key={factorNum} className="space-y-2.5">
                    <div className="px-1 text-[10px] font-black uppercase tracking-widest text-app-accent">
                      {FACTOR_NAMES[factorNum]}
                    </div>

                    {olqsInFactor.map((o: AnalyzedOlq) => {
                      const sel = selections[o.id] || { patternIds: [], suggestionIds: [], custom: [], note: "" };
                      const isExpanded = !!expandedOlq[o.id];
                      const sev = o.effTick <= 5 ? 5 : o.effTick >= 9 ? 9 : o.effTick;
                      const sevColor = SEVERITY_COLOR[sev] || SEVERITY_COLOR[7];
                      const selectedCount = sel.suggestionIds.length + sel.custom.filter((c) => c.title || c.do).length;

                      return (
                        <div
                          key={o.id}
                          className={cn(
                            "rounded-2xl border transition-all overflow-hidden",
                            isExpanded ? "bg-app-card border-app-accent/40 shadow-lg" : "bg-app-card/60 border-app-border hover:border-app-border/80"
                          )}
                        >
                          {/* Card Header Accordion */}
                          <div
                            onClick={() => setExpandedOlq((prev) => ({ ...prev, [o.id]: !prev[o.id] }))}
                            className="p-3.5 flex items-center justify-between cursor-pointer select-none gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={cn(
                                  "w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 border",
                                  sevColor.bg,
                                  sevColor.text,
                                  sevColor.border
                                )}
                              >
                                {o.tick}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-app-text-bright truncate">{o.name}</span>
                                  <span className="text-[10px] font-mono text-app-text-muted">({o.id})</span>
                                  {o.core && (
                                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-400/30">
                                      Core
                                    </span>
                                  )}
                                  {o.needsWork && (
                                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                      Needs Work
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-app-text-muted truncate mt-0.5">{o.tickText}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {selectedCount > 0 && (
                                <Badge tone="accent">
                                  {selectedCount} step{selectedCount > 1 ? "s" : ""}
                                </Badge>
                              )}
                              <button
                                type="button"
                                className="p-1 text-app-text-muted hover:text-app-text-bright"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Content: Patterns & Suggestions */}
                          {isExpanded && (
                            <div className="p-4 border-t border-app-border space-y-4 bg-black/20">
                              {/* Pattern Types */}
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-app-text-muted block">
                                  Observed Personality Pattern (Choose up to 3)
                                </span>
                                <div className="space-y-1.5">
                                  {o.patterns.map((p) => {
                                    const isChosen = sel.patternIds.includes(p.id);
                                    return (
                                      <label
                                        key={p.id}
                                        className={cn(
                                          "flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all",
                                          isChosen
                                            ? "bg-app-accent/15 border-app-accent text-app-text-bright"
                                            : "bg-app-card/40 border-app-border/70 text-app-text-muted hover:border-app-border hover:text-app-text-bright"
                                        )}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChosen}
                                          disabled={isAssessorCompleted}
                                          onChange={() => handleTogglePattern(o.id, p.id)}
                                          className="mt-0.5 accent-current"
                                        />
                                        <div className="space-y-0.5 min-w-0">
                                          <div className="font-bold flex items-center gap-2">
                                            <span>{p.label}</span>
                                            {p.score > 1.2 && (
                                              <span className="text-[8px] font-black uppercase text-app-accent px-1 rounded bg-app-accent/10 border border-app-accent/30">
                                                Suggested
                                              </span>
                                            )}
                                          </div>
                                          {p.seen && <p className="text-[11px] text-app-text-muted">{p.seen}</p>}
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Actionable Suggestion Steps */}
                              <div className="space-y-2 pt-2 border-t border-app-border/50">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-app-text-muted block">
                                  Actionable Improvement Steps
                                </span>
                                {(() => {
                                  // Gather suggestions from selected patterns or all candidates
                                  const relevantPats = o.patterns.filter((p) => sel.patternIds.includes(p.id));
                                  const displayPatterns = relevantPats.length > 0 ? relevantPats : o.patterns;
                                  const seenSugIds = new Set<string>();
                                  const sugList = displayPatterns.flatMap((p) => p.suggestions).filter((s) => {
                                    if (seenSugIds.has(s.id)) return false;
                                    seenSugIds.add(s.id);
                                    return true;
                                  });

                                  if (sugList.length === 0) {
                                    return (
                                      <p className="text-[11px] text-app-text-muted italic">
                                        No specific suggestions configured for this tick.
                                      </p>
                                    );
                                  }

                                  return (
                                    <div className="space-y-2">
                                      {sugList.map((sug) => {
                                        const isTicked = sel.suggestionIds.includes(sug.id);
                                        return (
                                          <label
                                            key={sug.id}
                                            className={cn(
                                              "flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all",
                                              isTicked
                                                ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200"
                                                : "bg-app-card/30 border-app-border/60 text-app-text-muted hover:border-app-border"
                                            )}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isTicked}
                                              disabled={isAssessorCompleted}
                                              onChange={() => handleToggleSuggestion(o.id, sug.id)}
                                              className="mt-0.5 accent-emerald-400"
                                            />
                                            <div className="space-y-1 min-w-0">
                                              <div className="font-bold flex items-center gap-2">
                                                <span className="text-app-text-bright">{sug.title}</span>
                                                <span className="text-[9px] font-semibold text-app-text-muted">
                                                  ({sug.weeks} wks · {sug.effort})
                                                </span>
                                              </div>
                                              <p className="text-[11px] text-app-text-muted/90">{sug.do}</p>
                                              <div className="text-[10px] text-app-text-muted/70 space-y-0.5">
                                                <div>
                                                  <strong className="text-app-text-muted">How:</strong> {sug.how}
                                                </div>
                                                <div>
                                                  <strong className="text-app-text-muted">Target Outcome:</strong> {sug.check}
                                                </div>
                                              </div>
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Mentor Note for this specific OLQ */}
                              <div className="space-y-1 pt-2 border-t border-app-border/40">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-app-text-muted block">
                                  Mentor Note for {o.name}
                                </label>
                                <input
                                  type="text"
                                  value={sel.note || ""}
                                  disabled={isAssessorCompleted}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSelections((prev) => ({
                                      ...prev,
                                      [o.id]: { ...(prev[o.id] || { patternIds: [], suggestionIds: [], custom: [] }), note: val },
                                    }));
                                  }}
                                  placeholder="Specific note or instruction for candidate..."
                                  className="w-full bg-black/40 border border-app-border focus:border-app-accent rounded-xl p-2.5 text-xs text-app-text-bright focus:outline-none transition-all"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMN 3: Live Report Preview & Action Integration (3.5 cols) */}
        <div className={cn("lg:col-span-3 space-y-6 lg:sticky lg:top-6", activeSubTab !== "report" && "hidden lg:block")}>
          <Card className="p-4 sm:p-6 space-y-5 border-app-border shadow-xl">
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-app-text-bright flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-app-accent/20 text-app-accent flex items-center justify-center text-[10px] font-black">
                  3
                </span>
                Plan &amp; Remarks Sync
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="p-1.5 rounded-lg bg-app-card hover:bg-app-accent/20 text-app-text-muted hover:text-app-accent transition-all cursor-pointer"
                  title="Copy formatted text"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="p-1.5 rounded-lg bg-app-card hover:bg-app-accent/20 text-app-text-muted hover:text-app-accent transition-all cursor-pointer"
                  title="Download report (.txt)"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>

            {/* Sync to Remarks Action Buttons */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-app-accent/10 border border-app-accent/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-app-accent block">
                Sync with Submission
              </span>
              <p className="text-[11px] text-app-text-muted leading-relaxed">
                Send this structured plan straight into your qualitative written remarks:
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  type="button"
                  variant="primary"
                  icon={Send}
                  onClick={() => handleApplyToRemarks("append")}
                  disabled={isAssessorCompleted || !compiledText}
                >
                  Append to Remarks
                </Button>
                <button
                  type="button"
                  onClick={() => handleApplyToRemarks("replace")}
                  disabled={isAssessorCompleted || !compiledText}
                  className="text-[10px] font-bold text-app-text-muted hover:text-rose-400 transition-colors uppercase tracking-wider text-center py-1 cursor-pointer"
                >
                  Replace existing remarks
                </button>
              </div>
            </div>

            {/* Quick Upload Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-app-border/40">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-app-text-muted">
                <span>Save to Server</span>
                {saving && <Loader2 size={12} className="animate-spin text-app-accent" />}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleUploadMarks}
                  disabled={saving || isAssessorCompleted}
                >
                  Save Marks
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleUploadRemarks}
                  disabled={saving || isAssessorCompleted}
                >
                  Save Remarks
                </Button>
              </div>
            </div>

            {/* Finalize Evaluation Button */}
            <div className="pt-2 border-t border-app-border/40">
              {isAssessorCompleted ? (
                <div className="p-3 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-xl text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2">
                  <FileCheck size={16} /> Evaluation Finalized
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUpdate("COMPLETED")}
                  disabled={saving}
                  className="w-full py-3 bg-app-accent text-app-on-accent rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Finalize Evaluation
                </button>
              )}
            </div>

            {/* Live Text Preview Box */}
            <div className="space-y-1.5 pt-2 border-t border-app-border/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-text-muted block">
                Live Report Preview
              </span>
              <div className="bg-black/50 border border-app-border rounded-xl p-3 max-h-72 overflow-y-auto text-[11px] font-mono leading-relaxed text-app-text-bright whitespace-pre-wrap select-text custom-scrollbar">
                {compiledText || "No steps selected yet. Check patterns and suggestions in Column 2 to assemble the report."}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
