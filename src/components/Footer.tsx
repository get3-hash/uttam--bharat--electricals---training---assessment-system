import React from "react";
import { ShieldCheck, Cpu } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#EAEAEA] dark:bg-[#2B2A28] text-[#757573] dark:text-[#B5B4B4] border-t border-[#D5D4D4] dark:border-[#403F3E] py-6 mt-auto text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Sleek Activity / System Status Bar */}
        <div className="bg-white dark:bg-[#403F3E] border border-[#D5D4D4] dark:border-[#52514E] rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-[#757573] dark:text-[#D5D4D4] font-medium shadow-xs">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#008DD2] rounded-full animate-pulse" />
              <span className="text-[#403F3E] dark:text-[#EAEAEA] font-semibold">Database Connected (Firebase Firestore)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#0078B2] rounded-full" />
              <span className="text-[#403F3E] dark:text-[#EAEAEA] font-semibold">AI PDF Parser & Anti-Cheating Active</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[#757573] dark:text-[#B5B4B4]">
            <span className="px-2 py-0.5 bg-[#E6F4FA] dark:bg-[#2B2A28] rounded text-[#006393] dark:text-[#59B5E2] font-bold border border-[#CCE8F6] dark:border-[#52514E]">v2.5.0-STABLE</span>
            <span className="font-semibold text-[#2B2A28] dark:text-[#EAEAEA]">Uttam (Bharat) Electricals Pvt. Ltd.</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-[#757573] dark:text-[#B5B4B4]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#008DD2]" />
            <span>Quality Management System & Digitized Training Engine</span>
          </div>
          <div>
            © {new Date().getFullYear()} Uttam (Bharat) Electricals Pvt. Ltd. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
