import React from "react";
import { ShieldCheck } from "lucide-react";
import { CompanyLogo } from "./CompanyLogo";
import { useTheme } from "../context/ThemeContext";

interface Props {
  subtitle?: string;
  compact?: boolean;
}

export const HeaderBranding: React.FC<Props> = ({ subtitle, compact = false }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <CompanyLogo variant="badge" darkBg={isDark} />
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-xl relative overflow-hidden transition-colors">
      {/* Top Colorful Brand Accent Ribbon */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 via-purple-600 to-amber-500" />

      {/* Subtle Sleek interface background ambient glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="bg-slate-50 dark:bg-slate-800/90 p-3 rounded-2xl shadow-xs dark:shadow-lg border border-slate-200 dark:border-slate-700/50 max-w-[280px] shrink-0">
              <CompanyLogo variant="full" darkBg={isDark} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded">
                  ESTD 1983
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> ISO 9001:2015 Certified
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                UTTAM (BHARAT) ELECTRICALS PVT. LTD.
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-tight mt-0.5 font-medium">
                {subtitle || "Employee Technical Training Assessment & Feedback Evaluation System"}
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-right border-l border-slate-200 dark:border-slate-800 pl-6">
            <div className="text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Manufacturing Division</p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">Power & Distribution Transformers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

