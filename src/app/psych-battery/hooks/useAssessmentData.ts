"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "../lib/api";
import { Assessment, AssessmentSlide, ModuleId } from "../types";

export const MODULE_ORDER: ModuleId[] = ["INTRO", "TAT", "WAT", "SRT_INST", "SRT", "SDT_INST", "SDT", "CLOSING"];

export function useAssessmentData(id?: string, previewModule?: string | null) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [allSlides, setAllSlides] = useState<AssessmentSlide[]>([]);
  // Only starts "loading" if an id is present on first render — avoids a
  // synchronous setState(false) for the no-id case inside the effect below.
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([api.assessments.get(id), api.assessments.slides(id)])
      .then(([assessmentData, slidesList]) => {
        if (cancelled) return;
        setAssessment(assessmentData);
        const normalizedSlides = (slidesList as AssessmentSlide[]).map((s) => ({
          ...s,
          isInstruction: s.isInstruction === true, // coerce undefined/null to false
        }));
        setAllSlides(normalizedSlides);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch assessment:", err);
        setError("Failed to load assessment data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Group slides by module
  const moduleSlideMap = useMemo(() => {
    const map: Record<ModuleId, AssessmentSlide[]> = { INTRO: [], TAT: [], WAT: [], SRT_INST: [], SRT: [], SDT_INST: [], SDT: [], CLOSING: [] };
    allSlides.forEach((s) => {
      if (map[s.module]) map[s.module].push(s);
    });
    // Sort within each module
    Object.keys(map).forEach((k) => map[k as ModuleId].sort((a, b) => (a.order || 0) - (b.order || 0)));
    return map;
  }, [allSlides]);

  // Only modules that have slides
  const activeModules = useMemo(() => {
    const modules = MODULE_ORDER.filter((m) => moduleSlideMap[m].length > 0);
    if (previewModule && modules.includes(previewModule as ModuleId)) {
      return [previewModule as ModuleId];
    }
    return modules;
  }, [moduleSlideMap, previewModule]);

  return {
    assessment,
    allSlides,
    loading,
    error,
    moduleSlideMap,
    activeModules,
  };
}
