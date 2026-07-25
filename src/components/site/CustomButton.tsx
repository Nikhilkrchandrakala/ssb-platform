"use client";

interface CustomButtonProps {
  text: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
}

export default function CustomButton({ text, onClick, disabled, type = "button", style = {} }: CustomButtonProps) {
  return (
    <button
      type={type}
      style={{
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
      className="ctaButton"
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
}
