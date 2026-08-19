import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

const variants: Record<string, CSSProperties> = {
  solid: {
    padding: "12px 20px",
    backgroundColor: "var(--color-solid-cta-bg)",
    boxShadow: "var(--border-solid-cta)",
    color: "var(--color-solid-cta-text)",
  },
  glass: {
    padding: "8px 24px",
    backgroundColor: "var(--color-glass-bg)",
    backdropFilter: "blur(var(--color-glass-blur))",
    boxShadow: "var(--shadow-chip)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-body)",
    fontWeight: 400,
    fontSize: 16,
    letterSpacing: "0.05em",
  },
  "glass-dark": {
    padding: "8px 24px",
    backgroundColor: "var(--color-glass-bg-strong)",
    backdropFilter: "blur(var(--color-glass-blur))",
    boxShadow: "var(--shadow-glass)",
    color: "var(--color-text-on-gold)",
  },
};

type ButtonProps = {
  children: ReactNode;
  variant?: "solid" | "glass" | "glass-dark";
  style?: CSSProperties;
} & (
  | ({ as: "a" } & AnchorHTMLAttributes<HTMLAnchorElement>)
  | ({ as?: "button" } & ButtonHTMLAttributes<HTMLButtonElement>)
);

export default function Button({ children, variant = "solid", style, as, ...rest }: ButtonProps) {
  const combinedStyle: CSSProperties = { ...variants[variant], ...style };
  if (as === "a") {
    return (
      <a className="btn" style={combinedStyle} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }
  return (
    <button className="btn" style={combinedStyle} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
