import Link from "next/link";
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
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    if (href && href.startsWith("/")) {
      return (
        <Link href={href} className="btn" style={combinedStyle} {...anchorRest}>
          {children}
        </Link>
      );
    }
    return (
      <a className="btn" style={combinedStyle} href={href} {...anchorRest}>
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
