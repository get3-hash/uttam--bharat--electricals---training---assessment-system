import React from "react";
import { ShieldCheck, Cpu } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800/80 py-6 mt-auto text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Sleek Activity / System Status Bar */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-600 dark:text-slate-400 font-medium shadow-xs">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Database Connected (Firebase Firestore)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-slate-700 dark:text-slate-300 font-semibold">AI PDF Parser & Anti-Cheating Active</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700/50">v2.5.0-STABLE</span>
            <span className="font-medium">Uttam (Bharat) Electricals Pvt. Ltd.</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
