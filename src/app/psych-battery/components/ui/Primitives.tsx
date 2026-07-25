"use client";

// Shared UI primitives for the psych-battery module. Every screen in this
// module (assessor, admin, meetings, student entry, review, upload) used to
// hand-roll its own card/badge/button/table markup with slightly different
// radii, paddings, and accent-contrast choices each time — the inconsistency
// (plus bg-app-accent paired with text-white in half the call sites, which
// fails WCAG AA at ~2.6:1 contrast) is what read as "bad design" rather than
// any single component. Centralizing the primitives here fixes both at once:
// change it here, every screen picks it up.
//
// Visual language: dark + gold "SSB with ISV" brand palette (kept
// deliberately, not swapped for a generic purple/indigo SaaS look), executed
// with glassmorphism, soft glow, and Framer Motion micro-interactions for a
// premium feel — see theme.css for the .glass-card / .app-mesh-bg / .bg-noise
// utilities these primitives build on.

import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

// ── Motion helpers ──────────────────────────────────────────────────────
// Shared entrance transition + a stagger-delay helper so grids of cards fan
// in instead of popping in all at once, capped so long lists don't take
// forever to finish revealing.
export const staggerDelay = (i: number, step = 0.045, cap = 0.4) => Math.min(i * step, cap);

export function Reveal({
  children,
  delay = 0,
  className,
  y = 14,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Animated number ──────────────────────────────────────────────────────
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = React.useState(reduceMotion ? value : 0);

  React.useEffect(() => {
    if (reduceMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(value);
      return;
    }
    let raf = 0;
    const duration = 600;
    const start = performance.now();
    const from = display;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion]);

  return <span className={cn("tabular-nums", className)}>{display}</span>;
}

// ── Card ─────────────────────────────────────────────────────────────────
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-app-sidebar border border-app-border rounded-2xl", className)} {...props}>
      {children}
    </div>
  );
}

// Frosted-glass variant with a gradient ring border and optional hover lift —
// used for the candidate grid, feature cards, and other "should feel alive"
// surfaces. Kept as a separate component from Card (rather than a prop) so
// the plain solid Card stays cheap/simple for tables and dense layouts.
export function GlassCard({
  className,
  children,
  hoverLift = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hoverLift?: boolean }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      whileHover={hoverLift && !reduceMotion ? { y: -4, transition: { duration: 0.2, ease: "easeOut" } } : undefined}
      className={cn("glass-card rounded-2xl shadow-glow", className)}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}

// ── Page Header ──────────────────────────────────────────────────────────
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <Reveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
      <div className="space-y-2 min-w-0">
        {eyebrow && (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-app-accent shadow-[0_0_8px_var(--color-app-accent)]" />
            <span className="text-[11px] font-bold text-app-accent uppercase tracking-[0.2em]">{eyebrow}</span>
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-app-text-bright leading-tight">{title}</h1>
        {description && <p className="text-app-text-muted text-sm max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </Reveal>
  );
}

// ── Stat tile ────────────────────────────────────────────────────────────
const statTone = {
  neutral: "text-app-text-bright",
  accent: "text-app-accent",
  success: "text-emerald-400",
  warning: "text-amber-400",
  danger: "text-red-400",
  info: "text-blue-400",
};

const statIconTone = {
  neutral: "bg-app-card text-app-text-muted",
  accent: "bg-app-accent/20 text-app-accent-light",
  success: "bg-emerald-500/20 text-emerald-300",
  warning: "bg-amber-500/20 text-amber-300",
  danger: "bg-red-500/20 text-red-300",
  info: "bg-blue-500/20 text-blue-300",
};

export function StatTile({
  label,
  value,
  tone = "neutral",
  icon: Icon,
  className,
}: {
  label: string;
  value: number | React.ReactNode;
  tone?: keyof typeof statTone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3.5 px-5 py-3.5 rounded-xl bg-app-card border border-app-border min-w-[112px]", className)}>
      {Icon && (
        <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", statIconTone[tone])}>
          <Icon size={17} />
        </span>
      )}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-[0.16em]">{label}</span>
        <span className={cn("text-2xl font-black leading-none", statTone[tone])}>
          {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
        </span>
      </div>
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────
const badgeTone = {
  neutral: "bg-app-card text-app-text-muted border-app-border",
  accent: "bg-app-accent/20 text-app-accent-light border-app-accent/40",
  success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  warning: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  danger: "bg-red-500/20 text-red-300 border-red-500/40",
  info: "bg-blue-500/20 text-blue-300 border-blue-500/40",
};

export function Badge({
  tone = "neutral",
  dot,
  className,
  children,
}: {
  tone?: keyof typeof badgeTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
        badgeTone[tone],
        className
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", statTone[tone] === "text-app-text-bright" ? "bg-app-text-muted" : "bg-current")} />}
      {children}
    </span>
  );
}

// ── Button ───────────────────────────────────────────────────────────────
// Every filled-accent variant uses --color-app-on-accent (near-black) for
// text, not white — see theme.css for the contrast math.
const buttonVariants = {
  primary: "bg-app-accent text-app-on-accent hover:bg-app-accent-light shadow-glow",
  secondary: "bg-app-card border border-app-border text-app-text-bright hover:border-app-accent/40 hover:text-app-accent",
  ghost: "text-app-text-muted hover:text-app-text-bright hover:bg-white/5",
  danger: "bg-red-500/20 border border-red-400/40 text-red-300 hover:bg-red-500/30",
};

const buttonSizes = {
  sm: "px-3 py-1.5 text-[11px] gap-1.5",
  md: "px-4 py-2.5 text-xs gap-2",
  lg: "px-6 py-3.5 text-sm gap-2.5",
};

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  icon?: LucideIcon;
}

export function Button({ variant = "secondary", size = "md", icon: Icon, className, children, disabled, ...props }: ButtonProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      whileHover={!disabled && !reduceMotion ? { y: -1.5, scale: 1.015 } : undefined}
      whileTap={!disabled && !reduceMotion ? { scale: 0.97 } : undefined}
      transition={{ duration: 0.15, ease: "easeOut" }}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    >
      {Icon && <Icon size={size === "lg" ? 18 : size === "sm" ? 13 : 15} />}
      {children}
    </motion.button>
  );
}

export function IconButton({
  icon: Icon,
  className,
  active,
  size = 18,
  title,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> & {
  icon: LucideIcon;
  active?: boolean;
  size?: number;
}) {
  const reduceMotion = useReducedMotion();
  const button = (
    <motion.button
      whileHover={!reduceMotion ? { y: -1.5 } : undefined}
      whileTap={!reduceMotion ? { scale: 0.94 } : undefined}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "inline-flex items-center justify-center p-2.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "bg-app-accent border-app-accent text-app-on-accent"
          : "bg-app-card border-app-border text-app-text-muted hover:text-app-text-bright hover:border-app-border",
        className
      )}
      {...props}
    >
      <Icon size={size} />
    </motion.button>
  );

  if (!title) return button;
  return <Tooltip label={title}>{button}</Tooltip>;
}

// ── Tooltip ──────────────────────────────────────────────────────────────
export function Tooltip({ children, label }: { children: React.ReactElement; label: string }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={8}
            className="z-50 px-2.5 py-1.5 rounded-lg bg-app-card border border-app-border text-app-text-bright text-[11px] font-semibold shadow-glow animate-in fade-in zoom-in-95 duration-150"
          >
            {label}
            <TooltipPrimitive.Arrow className="fill-app-card" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// ── Search input ─────────────────────────────────────────────────────────
export function SearchInput({
  className,
  containerClassName,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { containerClassName?: string }) {
  return (
    <div className={cn("relative flex-1", containerClassName)}>
      <SearchIconGlyph className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-muted pointer-events-none" />
      <input
        type="text"
        className={cn(
          "w-full bg-app-card border border-app-border rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-app-text-bright placeholder-app-text-muted",
          "focus:outline-none focus:border-app-accent/50 focus:ring-2 focus:ring-app-accent/15 transition-all",
          className
        )}
        {...props}
      />
    </div>
  );
}

function SearchIconGlyph({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <Reveal className="py-16 px-6 text-center">
      <div className="w-14 h-14 bg-app-card border border-app-border rounded-2xl flex items-center justify-center mx-auto mb-5 text-app-text-muted">
        <Icon size={26} strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-bold text-app-text-bright mb-1.5">{title}</h3>
      {description && <p className="text-app-text-muted text-sm max-w-sm mx-auto leading-relaxed">{description}</p>}
    </Reveal>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────
// Shimmering placeholder for loading states — swap in for the plain spinner
// wherever a layout's shape is known ahead of time (cards, rows, headers).
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-lg bg-app-card animate-pulse", className)} />;
}

// ── Avatar ───────────────────────────────────────────────────────────────
export function Avatar({
  src,
  alt,
  fallbackIcon: FallbackIcon,
  size = 44,
  className,
}: {
  src?: string | null;
  alt: string;
  fallbackIcon: LucideIcon;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-xl bg-app-card border border-app-border overflow-hidden flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <FallbackIcon size={size * 0.45} className="text-app-text-muted" />
      )}
    </div>
  );
}

// ── Segmented control (role toggles, view-mode switches, etc.) ─────────────
// The active option is a motion element carrying a shared layoutId, so
// switching options slides the highlight pill instead of just swapping
// colors — the little detail that makes tab switches like this feel like
// Linear/Vercel rather than a plain button group.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const layoutId = React.useId();
  return (
    <div className={cn("inline-flex gap-1 p-1 bg-app-card border border-app-border rounded-xl", className)}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer",
              isActive ? "text-app-on-accent" : "text-app-text-muted hover:text-app-text-bright"
            )}
          >
            {isActive && (
              <motion.span
                layoutId={`segmented-${layoutId}`}
                className="absolute inset-0 bg-app-accent rounded-lg -z-10"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Table shells ─────────────────────────────────────────────────────────
export function TableShell({ children, minWidth = 900 }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse" style={{ minWidth }}>
          {children}
        </table>
      </div>
    </Card>
  );
}

export function Th({ className, align = "left", children }: { className?: string; align?: "left" | "center" | "right"; children: React.ReactNode }) {
  return (
    <th
      className={cn(
        "py-3.5 px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-app-text-muted border-b border-app-border bg-black/20",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ className, align = "left", children }: { className?: string; align?: "left" | "center" | "right"; children: React.ReactNode }) {
  return (
    <td className={cn("py-4 px-5 align-middle", align === "center" && "text-center", align === "right" && "text-right", className)}>{children}</td>
  );
}

export function Tr({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("border-b border-app-border last:border-0 hover:bg-white/[0.03] transition-colors", className)} {...props}>
      {children}
    </tr>
  );
}

// ── Dialog (modal) ───────────────────────────────────────────────────────
// Radix-backed replacement for the module's hand-rolled `fixed inset-0`
// modals — gets focus trapping, Escape-to-close, and aria wiring for free.
export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitiveRoot open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitiveRoot>
  );
}

// Re-exported under a local name to keep the Radix import isolated to this
// file — see DialogContent below for the actual styled overlay/content pair.
import * as RadixDialog from "@radix-ui/react-dialog";
const DialogPrimitiveRoot = RadixDialog.Root;

export function DialogContent({
  children,
  className,
  maxWidth = "max-w-lg",
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}) {
  return (
    <RadixDialog.Portal>
      <AnimatePresence>
        <RadixDialog.Overlay key="dialog-overlay" asChild forceMount>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999]"
          />
        </RadixDialog.Overlay>
        <RadixDialog.Content key="dialog-content" asChild forceMount>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[calc(100vw-2rem)]",
              "bg-app-sidebar border border-app-border rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto",
              maxWidth,
              className
            )}
          >
            {children}
          </motion.div>
        </RadixDialog.Content>
      </AnimatePresence>
    </RadixDialog.Portal>
  );
}
export const DialogTitle = RadixDialog.Title;
export const DialogClose = RadixDialog.Close;
