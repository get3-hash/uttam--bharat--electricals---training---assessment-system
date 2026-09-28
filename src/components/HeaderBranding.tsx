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
        <CompanyLogo variant="badge" darkBg={false} />
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FFFFFF] text-[#2B2A28] border-b border-[#D5D4D4] shadow-xs relative overflow-hidden transition-colors">
      {/* Top Uttam Brand Accent Ribbon: Approved Gradient #006393 -> #008DD2 */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#006393] to-[#008DD2]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="bg-[#FFFFFF] p-2.5 rounded-xl border border-[#D5D4D4] max-w-[280px] shrink-0">
              <CompanyLogo variant="full" darkBg={false} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold bg-[#E6F4FA] text-[#006393] border border-[#59B5E2] rounded">
                  ESTD 1983
                </span>
                <span className="flex items-center gap-1 text-[11px] text-[#757573] font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#008DD2]" /> ISO 9001:2015 Certified
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#2B2A28] mt-1">
                UTTAM (BHARAT) ELECTRICALS PVT. LTD.
              </h1>
              <p className="text-xs text-[#403F3E] uppercase tracking-tight mt-0.5 font-medium">
                {subtitle || "Employee Technical Training Assessment & Feedback Evaluation System"}
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-right border-l border-[#D5D4D4] pl-6">
            <div className="text-xs">
              <p className="font-bold text-[#2B2A28] uppercase tracking-wider">Manufacturing Division</p>
              <p className="text-[11px] text-[#008DD2] font-semibold">Power & Distribution Transformers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
