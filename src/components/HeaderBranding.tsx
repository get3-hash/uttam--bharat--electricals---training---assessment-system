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
    <div className="w-full bg-white dark:bg-[#2B2A28] text-[#2B2A28] dark:text-white border-b border-[#D5D4D4] dark:border-[#403F3E] shadow-xs relative overflow-hidden transition-colors">
      {/* Top Uttam Brand Accent Ribbon */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#006393] via-[#008DD2] to-[#59B5E2]" />

      {/* Subtle Sleek interface background ambient glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#008DD2]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="bg-[#EAEAEA] dark:bg-[#403F3E] p-3 rounded-2xl shadow-xs border border-[#D5D4D4] dark:border-[#52514E] max-w-[280px] shrink-0">
              <CompanyLogo variant="full" darkBg={isDark} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold bg-[#E6F4FA] dark:bg-[#403F3E] text-[#006393] dark:text-[#59B5E2] border border-[#CCE8F6] dark:border-[#52514E] rounded">
                  ESTD 1983
                </span>
                <span className="flex items-center gap-1 text-[11px] text-[#757573] dark:text-[#D5D4D4] font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#008DD2]" /> ISO 9001:2015 Certified
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#2B2A28] dark:text-white mt-1">
                UTTAM (BHARAT) ELECTRICALS PVT. LTD.
              </h1>
              <p className="text-xs text-[#757573] dark:text-[#D5D4D4] uppercase tracking-tight mt-0.5 font-medium">
                {subtitle || "Employee Technical Training Assessment & Feedback Evaluation System"}
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-right border-l border-[#D5D4D4] dark:border-[#403F3E] pl-6">
            <div className="text-xs">
              <p className="font-bold text-[#2B2A28] dark:text-white uppercase tracking-wider">Manufacturing Division</p>
              <p className="text-[11px] text-[#008DD2] dark:text-[#59B5E2] font-bold">Power & Distribution Transformers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

