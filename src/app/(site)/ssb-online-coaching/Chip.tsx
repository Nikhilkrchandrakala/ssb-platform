import type { CSSProperties, ReactNode } from "react";

export default function Chip({
  children,
  active = false,
  style,
}: {
  children: ReactNode;
  active?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div className={`chip${active ? " active" : ""}`} style={style}>
      {children}
    </div>
  );
}
