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
          ? "bg-slate-900/95 backdrop-blur-md border border-slate-800 text-slate-100 shadow-xl shadow-slate-950/40"
          : "bg-white backdrop-blur-md border border-slate-200 text-slate-900 shadow-sm hover:shadow-md"
      } ${className}`}
    >
      {children}
    </div>
  );
};
