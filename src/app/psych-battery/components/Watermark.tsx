import React from "react";

interface WatermarkProps {
  user: {
    name?: string;
    email?: string;
  } | null;
  isAdminPreview?: boolean;
}

const GRID_COLS = 6;
const GRID_ROWS = 9;

export const Watermark: React.FC<WatermarkProps> = ({ user, isAdminPreview }) => {
  if (isAdminPreview || !user) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden select-none opacity-[0.05] grid"
      style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)` }}
    >
      {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, idx) => (
        <div key={idx} className="flex items-center justify-center overflow-visible">
          <span className="text-white text-[11px] font-black tracking-widest uppercase rotate-[-25deg] whitespace-nowrap">
            {user.name || "Candidate"} ({user.email})
          </span>
        </div>
      ))}
    </div>
  );
};
