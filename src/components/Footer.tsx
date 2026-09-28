import React from "react";
import { ShieldCheck, Cpu } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#FFFFFF] text-[#757573] border-t border-[#D5D4D4] py-6 mt-auto text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* System Status Bar */}
        <div className="bg-[#EAEAEA] border border-[#D5D4D4] rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-[#403F3E] font-medium shadow-xs">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#008DD2] rounded-full" />
              <span className="text-[#2B2A28] font-semibold">Database Connected (Firebase Firestore)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#006393] rounded-full" />
              <span className="text-[#2B2A28] font-semibold">AI Question Parser & Assessment Engine Active</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[#757573]">
            <span className="px-2 py-0.5 bg-[#FFFFFF] rounded text-[#2B2A28] font-bold border border-[#D5D4D4]">v2.5.0-STABLE</span>
            <span className="font-medium text-[#403F3E]">Uttam (Bharat) Electricals Pvt. Ltd.</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-[#757573]">
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
