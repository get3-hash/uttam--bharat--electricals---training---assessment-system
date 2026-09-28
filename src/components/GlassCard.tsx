import React from "react";
import { useTheme } from "../context/ThemeContext";

interface Props {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}

export const GlassCard: React.FC<Props> = ({ children, className = "" }) => {
  return (
    <div
      className={`rounded-2xl transition-colors duration-200 bg-white dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm dark:shadow-xl dark:shadow-slate-950/40 hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
};
