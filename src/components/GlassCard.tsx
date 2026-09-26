import React from "react";
import { useTheme } from "../context/ThemeContext";

interface Props {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}

export const GlassCard: React.FC<Props> = ({ children, className = "" }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`rounded-2xl transition-colors duration-200 ${
        isDark
          ? "bg-[#2B2A28] border border-[#403F3E] text-white shadow-md"
          : "bg-white border border-[#D5D4D4] text-[#2B2A28] shadow-xs hover:shadow-sm"
      } ${className}`}
    >
      {children}
    </div>
  );
};
