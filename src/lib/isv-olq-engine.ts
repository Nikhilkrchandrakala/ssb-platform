/* SSB with ISV : OLQ Improvement Engine (TypeScript Port)
   No external dependencies.
*/

export interface OlqSuggestion {
  id: string;
  title: string;
  do: string;
  how: string;
  check: string;
  for: number[];
  weeks: number;
  effort: "S" | "M" | "L";
}

export interface OlqPattern {
  id: string;
  label: string;
  for: number[];
  seen: Record<string, string>;
  root: string;
  tasks: string[];
  sig: [string, number[], number][];
  sug: string[];
}

export interface OlqDefinition {
  id: string;
  name: string;
  factor: number;
  trainability: "high" | "medium" | "low";
  meaning: string;
  trainNote: string;
  influencedBy: string[];
  tick: Record<string, string>;
  strength: string;
}

export interface OlqLibraryItem {
  olq: OlqDefinition;
  patterns: OlqPattern[];
  suggestions: OlqSuggestion[];
}

export interface MarksBand {
  min: number;
  max: number;
  code: string;
  label: string;
}

export interface EngineConfig {
  order: string[];
  factors: Record<string, string[]>;
  factorNames: Record<string, string>;
  coreQualities: string[];
  severity: Record<string, number>;
  trainFactor: Record<string, number>;
  coreBonus: number;
  leverageStep: number;
  maxFocus: number;
  marksBands: MarksBand[];
  limitationMarks: { n: number; min: number; max: number }[];
  factorLimitation: Record<string, string>;
  profiles: Record<
    string,
    {
      label: string;
      desc: string;
      tag: string[];
      conds: [string, number[], number][];
      threshold: number;
      boosts: string[];
    }
  >;
  autoBoost: number;
  tagBoost: number;
  stretchBase: number;
  baseline: Record<string, number>;
  baselineNote?: string;
  textWeight: number;
}

export interface KwConfig {
  _note?: string;
  phrases: Record<string, string[]>;
  weights: Record<string, number>;
  defaultWeight: number;
  capPerPattern: number;
  _compiled?: Record<string, { src: string; re: RegExp; w: number }[]>;
}

export interface OlqLibrary {
  version: string;
  built: string;
  config: EngineConfig;
  kw: KwConfig;
  olqs: Record<string, OlqLibraryItem>;
}

export interface RankedPattern {
  id: string;
  label: string;
  score: number;
  stretch: boolean;
  seen: string;
  root: string;
  tasks: string[];
  reasons: string[];
  suggestions: OlqSuggestion[];
}

export interface AnalyzedOlq {
  id: string;
  name: string;
  factor: number;
  tick: number;
  effTick: number;
  meaning: string;
  trainNote: string;
  trainability: "high" | "medium" | "low";
  tickText: string;
  core: boolean;
  leverage: number;
  priority: number;
  needsWork: boolean;
  patterns: RankedPattern[];
  confidence: "none" | "low" | "medium" | "high";
}

export interface ProfileMatch {
  id: string;
  label: string;
  desc: string;
  source: string;
}

export interface AnalysisInput {
  shade: string;
  marks?: number | string | null;
  tags?: string[];
  text?: string;
}

export interface AnalysisResult {
  ok: boolean;
  error?: string;
  shade: string;
  ticks: number[];
  tickMap: Record<string, number>;
  marks: number | null;
  band: MarksBand | null;
  limitations: number;
  factorsWithLimit: number;
  profiles: ProfileMatch[];
  olqs: AnalyzedOlq[];
  focus: string[];
  flags: string[];
}

export interface CustomStep {
  title: string;
  do: string;
}

export interface OlqSelection {
  patternIds: string[];
  suggestionIds: string[];
  custom: CustomStep[];
  note: string;
}

export type SelectionsMap = Record<string, OlqSelection>;

export interface ReportMeta {
  name?: string;
  id?: string;
  date?: string;
  assessor?: string;
  intro?: string;
  closing?: string;
  hideSeen?: boolean;
}

export interface ReportSection {
  olq: string;
  name: string;
  tick: number;
  effTick: number;
  rank: number;
  tickText: string;
  seen: string;
  patternLabel: string;
  items: OlqSuggestion[];
  custom: CustomStep[];
  note: string;
}

export interface CompiledReport {
  meta: ReportMeta;
  shade: string;
  sections: ReportSection[];
  weeksTotal: number;
}

export const OLQ_KEYS_ORDER = [
  { id: "effective_intelligence", code: "EI", engineId: "EI" },
  { id: "reasoning_ability", code: "RA", engineId: "RA" },
  { id: "organizing_ability", code: "OA", engineId: "OA" },
  { id: "power_of_expression", code: "POE", engineId: "POE" },
  { id: "social_adaptability", code: "SA", engineId: "SA" },
  { id: "cooperation", code: "COOP", engineId: "COOP" },
  { id: "sense_of_responsibility", code: "SOR", engineId: "SOR" },
  { id: "initiative", code: "INIT", engineId: "INI" },
  { id: "self_confidence", code: "SC", engineId: "SC" },
  { id: "speed_of_decision", code: "SOD", engineId: "SOD" },
  { id: "ability_to_influence_the_group", code: "AIG", engineId: "AIG" },
  { id: "liveliness", code: "LIV", engineId: "LIV" },
  { id: "determination", code: "D", engineId: "DET" },
  { id: "courage", code: "C", engineId: "COUR" },
  { id: "stamina", code: "S", engineId: "STA" },
] as const;

export function scoresToShade(scores: Record<string, number | string | undefined>): string {
  return OLQ_KEYS_ORDER.map((item) => {
    const val = scores[item.id];
    if (val !== undefined && val !== null && val !== "") {
      const num = Number(val);
      if (!isNaN(num) && num >= 1 && num <= 9) return String(num);
    }
    return "7"; // Reasonable fallback default
  }).join("");
}

export function formatShade(shade: string): string {
  const digits = shade.replace(/[^0-9]/g, "");
  if (digits.length !== 15) return digits;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 12)} ${digits.slice(12, 15)}`;
}

export function shadeToScores(shade: string, existingScores?: Record<string, number | string>): Record<string, number | string> {
  const digits = shade.replace(/[^0-9]/g, "");
  const res: Record<string, number | string> = { ...(existingScores || {}) };
  OLQ_KEYS_ORDER.forEach((item, index) => {
    if (index < digits.length) {
      const parsed = parseInt(digits[index], 10);
      if (!isNaN(parsed)) {
        res[item.id] = parsed;
      }
    }
  });
  return res;
}

export function normTick(t: number): number {
  return t <= 5 ? 5 : t >= 9 ? 9 : t;
}

export function sigTick(t: number): number {
  return t <= 5 ? 5 : t >= 8 ? 8 : t;
}

export function parseShade(str: string): { ok: true; ticks: number[] } | { ok: false; error: string } {
  const digits = String(str || "").replace(/[^0-9]/g, "");
  if (digits.length !== 15) return { ok: false, error: "Need 15 ticks (4+3+5+3). Found " + digits.length + "." };
  const ticks = digits.split("").map((c) => parseInt(c, 10));
  if (ticks.some((t) => isNaN(t) || t < 1 || t > 9)) {
    return { ok: false, error: "Ticks must be between 1 and 9." };
  }
  return { ok: true, ticks };
}

export function marksBand(cfg: EngineConfig, marks: number | string | null | undefined): MarksBand | null {
  if (marks == null || marks === "" || isNaN(Number(marks))) return null;
  const m = Number(marks);
  for (let i = 0; i < cfg.marksBands.length; i++) {
    const b = cfg.marksBands[i];
    if (m >= b.min && m <= b.max) return b;
  }
  return null;
}

function leverageMap(lib: OlqLibrary): Record<string, number> {
  const lev: Record<string, number> = {};
  lib.config.order.forEach((id) => {
    lev[id] = 0;
  });
  lib.config.order.forEach((id) => {
    (lib.olqs[id]?.olq?.influencedBy || []).forEach((src) => {
      if (lev[src] != null) lev[src] += 1;
    });
  });
  return lev;
}

function matchScore(sig: [string, number[], number][], tickMap: Record<string, number>): { score: number; hits: string[] } {
  let s = 0;
  const hits: string[] = [];
  sig.forEach((x) => {
    const t = tickMap[x[0]];
    if (t == null) return;
    if (x[1].indexOf(sigTick(t)) !== -1) {
      s += x[2];
      hits.push(x[0] + " " + t);
    }
  });
  return { score: s, hits };
}

function baselineMap(cfg: EngineConfig): Record<string, number> {
  return cfg.baseline || {};
}

function centredScore(cfg: EngineConfig, sig: [string, number[], number][], tickMap: Record<string, number>): { score: number; hits: string[] } {
  const actual = matchScore(sig, tickMap);
  const bm = matchScore(sig, baselineMap(cfg));
  return { score: actual.score - bm.score, hits: actual.hits.filter((h) => bm.hits.indexOf(h) === -1) };
}

function compileKw(kw: KwConfig): KwConfig {
  if (!kw || kw._compiled) return kw;
  const out: Record<string, { src: string; re: RegExp; w: number }[]> = {};
  Object.keys(kw.phrases).forEach((pid) => {
    out[pid] = kw.phrases[pid]
      .map((p) => {
        let re: RegExp | null = null;
        try {
          re = new RegExp(p, "i");
        } catch {
          re = null;
        }
        const w = kw.weights && kw.weights[p] != null ? kw.weights[p] : kw.defaultWeight;
        return re ? { src: p, re, w } : null;
      })
      .filter((x): x is { src: string; re: RegExp; w: number } => Boolean(x));
  });
  kw._compiled = out;
  return kw;
}

function textScore(kw: KwConfig, pid: string, text: string): { score: number; hits: string[] } {
  if (!text || !kw || !kw._compiled || !kw._compiled[pid]) return { score: 0, hits: [] };
  let s = 0;
  const hits: string[] = [];
  kw._compiled[pid].forEach((x) => {
    const m = x.re.exec(text);
    if (m) {
      s += x.w;
      hits.push(m[0].trim().slice(0, 40));
    }
  });
  return { score: Math.min(s, kw.capPerPattern || 3), hits };
}

function detectProfiles(
  cfg: EngineConfig,
  tickMap: Record<string, number>,
  tags?: string[]
): { id: string; label: string; desc: string; source: string; strength: number; boosts: string[] }[] {
  const out: { id: string; label: string; desc: string; source: string; strength: number; boosts: string[] }[] = [];
  const tagSet: Record<string, boolean> = {};
  (tags || []).forEach((t) => {
    tagSet[String(t).toLowerCase().trim()] = true;
  });

  Object.keys(cfg.profiles).forEach((pid) => {
    const p = cfg.profiles[pid];
    const m = matchScore(p.conds || [], tickMap);
    const mb = matchScore(p.conds || [], baselineMap(cfg));
    const auto = p.conds && p.conds.length && m.score >= p.threshold && m.score - mb.score >= p.threshold * 0.5;
    const manual = (p.tag || []).some((t) => tagSet[t]) || Boolean(tagSet[pid]);
    if (auto || manual) {
      out.push({
        id: pid,
        label: p.label,
        desc: p.desc,
        source: manual ? "assessor tag" : "auto",
        strength: manual ? 1 : Math.min(1, m.score / (p.threshold * 1.5)),
        boosts: p.boosts,
      });
    }
  });
  out.sort((a, b) => b.strength - a.strength);
  return out;
}

export function analyse(lib: OlqLibrary, input: AnalysisInput): AnalysisResult {
  const cfg = lib.config;
  const parsed = parseShade(input.shade);
  if (!parsed.ok) {
    return {
      ok: false,
      error: "error" in parsed ? parsed.error : "Invalid ticks format",
      shade: input.shade,
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

  const ticks = parsed.ticks;
  const tickMap: Record<string, number> = {};
  cfg.order.forEach((id, i) => {
    tickMap[id] = ticks[i];
  });

  const kw = compileKw(lib.kw);
  const text = String(input.text || "").toLowerCase();
  const profiles = detectProfiles(cfg, tickMap, input.tags);
  const boostFor: Record<string, number> = {};
  profiles.forEach((pr) => {
    const add = pr.source === "assessor tag" ? cfg.tagBoost : cfg.autoBoost * pr.strength;
    pr.boosts.forEach((pid) => {
      boostFor[pid] = (boostFor[pid] || 0) + add;
    });
  });

  const lev = leverageMap(lib);
  const olqs: AnalyzedOlq[] = cfg.order.map((id) => {
    const L = lib.olqs[id];
    if (!L) {
      throw new Error(`Missing OLQ definition in library for: ${id}`);
    }
    const raw = tickMap[id];
    const eff = normTick(raw);
    const sugMap: Record<string, OlqSuggestion> = {};
    L.suggestions.forEach((s) => {
      sugMap[s.id] = s;
    });

    const cands = L.patterns.filter((p) => p.for.indexOf(eff) !== -1);
    const ranked: RankedPattern[] = cands
      .map((p) => {
        const isStretch = /_STRETCH$/.test(p.id);
        const m = centredScore(cfg, p.sig || [], tickMap);
        const boost = boostFor[p.id] || 0;
        const tx = isStretch ? { score: 0, hits: [] } : textScore(kw, p.id, text);
        const score = isStretch ? (eff === 6 ? cfg.stretchBase : 1) : m.score + boost + tx.score * (cfg.textWeight || 1);
        const reasons: string[] = [];
        if (tx.hits.length) reasons.push('write-up: "' + tx.hits.slice(0, 3).join('", "') + '"');
        if (m.hits.length && m.score > 0) reasons.push("ticks: " + m.hits.slice(0, 3).join(", "));
        if (boost) reasons.push("profile fit");
        return {
          id: p.id,
          label: p.label,
          score: Math.round(score * 100) / 100,
          stretch: isStretch,
          seen: p.seen[String(eff)] || "",
          root: p.root,
          tasks: p.tasks,
          reasons,
          suggestions: p.sug
            .map((sid) => sugMap[sid])
            .filter((s): s is OlqSuggestion => Boolean(s) && s.for.indexOf(eff) !== -1),
        };
      })
      .sort((a, b) => b.score - a.score);

    let confidence: "none" | "low" | "medium" | "high" = "none";
    if (ranked.length) {
      const top = ranked[0].score;
      const second = ranked[1] ? ranked[1].score : 0;
      if (ranked[0].stretch) confidence = "high";
      else if (top >= 1.2 && top - second >= 0.6) confidence = "high";
      else if (top >= 0.6 && top - second >= 0.3) confidence = "medium";
      else if (top > 0.2) confidence = "low";
    }

    const isCore = cfg.coreQualities.indexOf(id) !== -1;
    const sev = cfg.severity[String(eff)] || 0;
    const priority = sev * (1 + (isCore ? cfg.coreBonus : 0)) * (1 + (lev[id] || 0) * cfg.leverageStep) * cfg.trainFactor[L.olq.trainability];

    return {
      id,
      name: L.olq.name,
      factor: L.olq.factor,
      tick: raw,
      effTick: eff,
      meaning: L.olq.meaning,
      trainNote: L.olq.trainNote,
      trainability: L.olq.trainability,
      tickText: eff <= 5 ? L.olq.strength : L.olq.tick[String(eff)] || "",
      core: isCore,
      leverage: lev[id] || 0,
      priority: Math.round(priority * 100) / 100,
      needsWork: eff >= 7,
      patterns: ranked,
      confidence,
    };
  });

  const focus = olqs
    .filter((o) => o.priority > 0)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, cfg.maxFocus)
    .map((o) => o.id);

  // Guideline checks (assessor only)
  const flags: string[] = [];
  const limits = ticks.filter((t) => t >= 8).length;
  const factorsWithLimit = Object.keys(cfg.factors).filter((f) => {
    return cfg.factors[f].some((id) => tickMap[id] >= 8);
  }).length;
  const band = marksBand(cfg, input.marks);
  const lm = cfg.limitationMarks.filter((r) => r.n === Math.min(limits, 9))[0];
  if (input.marks != null && input.marks !== "" && !isNaN(Number(input.marks))) {
    const m = Number(input.marks);
    if (limits >= 10 && m >= 60) {
      flags.push("Ten or more limitations normally fall below 60. Marks entered: " + m + ".");
    } else if (lm && limits <= 9 && (m < lm.min || m > lm.max)) {
      flags.push(
        limits +
          " limitations normally carry " +
          lm.min +
          (lm.max < 999 ? " to " + lm.max : " and above") +
          " marks. Marks entered: " +
          m +
          ". Please recheck."
      );
    }
  }
  if (factorsWithLimit === 4) {
    flags.push("Limitation in all four factors: " + cfg.factorLimitation["4"] + ".");
  }
  if (cfg.factors["1"].filter((id) => tickMap[id] === 8).length >= 2) {
    flags.push("Two or more 8s in Factor 1 make the overall Factor 1 tick 8.");
  }
  cfg.coreQualities.forEach((id) => {
    if (tickMap[id] >= 8) flags.push("Core quality " + id + " at " + tickMap[id] + ". Treat as high priority.");
  });
  const f2 = cfg.factors["2"].map((id) => tickMap[id]);
  if (f2.every((t) => t === 7)) {
    flags.push("Factor 2 at 777 can read as an overall 7 and needs great caution.");
  }
  if (input.marks != null && input.marks !== "" && Number(input.marks) >= 82 && Number(input.marks) <= 89) {
    flags.push("Marks 82 to 89 are normally avoided by the guideline.");
  }

  return {
    ok: true,
    shade: ticks.join(""),
    ticks,
    tickMap,
    marks: input.marks == null || input.marks === "" ? null : Number(input.marks),
    band,
    limitations: limits,
    factorsWithLimit,
    profiles: profiles.map((p) => ({ id: p.id, label: p.label, desc: p.desc, source: p.source })),
    olqs,
    focus,
    flags,
  };
}

export function compileReport(lib: OlqLibrary, analysis: AnalysisResult, selections: SelectionsMap, meta?: ReportMeta): CompiledReport {
  meta = meta || {};
  const sections: ReportSection[] = [];
  analysis.olqs.forEach((o) => {
    const sel = selections[o.id];
    if (!sel) return;
    const L = lib.olqs[o.id];
    if (!L) return;
    const sugAll: Record<string, OlqSuggestion> = {};
    L.suggestions.forEach((s) => {
      sugAll[s.id] = s;
    });
    const items = (sel.suggestionIds || []).map((id) => sugAll[id]).filter(Boolean);
    const custom = (sel.custom || []).filter((c) => c && (c.title || c.do));
    const pid = (sel.patternIds || [])[0];
    const pat = o.patterns.filter((p) => p.id === pid)[0] || null;
    if (!items.length && !custom.length && !sel.note) return;
    sections.push({
      olq: o.id,
      name: o.name,
      tick: o.tick,
      effTick: o.effTick,
      rank: analysis.focus.indexOf(o.id),
      tickText: o.tickText,
      seen: pat ? pat.seen : "",
      patternLabel: pat ? pat.label : "",
      items,
      custom,
      note: sel.note || "",
    });
  });

  sections.sort((a, b) => {
    const ra = a.rank === -1 ? 99 : a.rank;
    const rb = b.rank === -1 ? 99 : b.rank;
    return ra - rb || b.effTick - a.effTick;
  });

  let maxWeeks = 0;
  sections.forEach((s) => {
    s.items.forEach((i) => {
      maxWeeks = Math.max(maxWeeks, i.weeks || 0);
    });
  });

  return { meta, shade: analysis.shade, sections, weeksTotal: maxWeeks };
}

export function toText(report: CompiledReport): string {
  const m = report.meta;
  const lines: string[] = [];
  lines.push("SSB with ISV | Personal Improvement Plan");
  if (m.name) lines.push("Aspirant: " + m.name);
  if (m.date) lines.push("Date: " + m.date);
  if (m.assessor) lines.push("Prepared by: " + m.assessor);
  lines.push("");
  if (m.intro) {
    lines.push(m.intro);
    lines.push("");
  }
  report.sections.forEach((s, i) => {
    lines.push(i + 1 + ". " + s.name + " (" + s.olq + ")");
    if (s.seen && !m.hideSeen) lines.push("   What was noticed: " + s.seen);
    s.items.forEach((it, j) => {
      lines.push("   " + String.fromCharCode(97 + j) + ") " + it.title + " (" + it.weeks + " weeks)");
      lines.push("      Do: " + it.do);
      lines.push("      How: " + it.how);
      lines.push("      You will know it is working when: " + it.check);
    });
    (s.custom || []).forEach((c, j) => {
      lines.push("   " + String.fromCharCode(97 + s.items.length + j) + ") " + (c.title || "Additional step"));
      if (c.do) lines.push("      Do: " + c.do);
    });
    if (s.note) lines.push("   Mentor note: " + s.note);
    lines.push("");
  });
  if (m.closing) lines.push(m.closing);
  return lines.join("\n");
}
