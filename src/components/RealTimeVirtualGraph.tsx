import React, { useState } from "react";
import { CheckCircle2, XCircle, Star, Sparkles } from "lucide-react";

export interface VirtualGraphDataPoint {
  label: string;
  value: number; // For feedback: 0-5. For pass rate: 0-100
  fullName?: string;
  sublabel?: string;
  department?: string;
  status?: "passed" | "failed" | "neutral";
  date?: string;
}

interface RealTimeVirtualGraphProps {
  type: "feedback" | "passRate";
  data: VirtualGraphDataPoint[];
  currentAverage?: string | number; // Total overall average
  totalCount?: number;             // Total submissions / attempts
  totalPassed?: number;            // Total passed attempts across all
  totalFailed?: number;            // Total failed attempts across all
  maxRecent?: number;              // Number of recent people to show (default 4)
  className?: string;
  height?: number;
}

export const RealTimeVirtualGraph: React.FC<RealTimeVirtualGraphProps> = ({
  type,
  data,
  currentAverage,
  totalCount,
  totalPassed,
  totalFailed,
  maxRecent = 4,
  className = "",
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const isFeedback = type === "feedback";
  const hasRealData = data && data.length > 0;

  // Take the 4 most recent entries
  const effectivePoints: VirtualGraphDataPoint[] = hasRealData
    ? data.slice(-maxRecent)
    : isFeedback
    ? [
        { label: "Vikram", fullName: "Vikram Sharma", value: 4.5, department: "Production" },
        { label: "Mahesh", fullName: "Mahesh Kumar", value: 5.0, department: "Quality" },
        { label: "Hariom", fullName: "Hariom Prajapat", value: 3.8, department: "Assembly" },
        { label: "Shankar", fullName: "Shankar Lal", value: 4.8, department: "Testing" },
      ]
    : [
        { label: "Vikram", fullName: "Vikram Sharma", value: 80, department: "Production", status: "passed" },
        { label: "Mahesh", fullName: "Mahesh Kumar", value: 40, department: "Quality", status: "failed" },
        { label: "Hariom", fullName: "Hariom Prajapat", value: 90, department: "Assembly", status: "passed" },
        { label: "Shankar", fullName: "Shankar Lal", value: 50, department: "Testing", status: "failed" },
      ];

  const allTotal = totalCount !== undefined ? totalCount : (hasRealData ? data.length : 4);
  const allPassed = totalPassed !== undefined ? totalPassed : (hasRealData ? data.filter(d => d.status === "passed" || d.value >= 60).length : 2);
  const allFailed = totalFailed !== undefined ? totalFailed : Math.max(0, allTotal - allPassed);
  const overallPassRatio = allTotal > 0 ? Math.round((allPassed / allTotal) * 100) : 0;

  const activeItem = hoveredIdx !== null ? effectivePoints[hoveredIdx] : null;

  return (
    <div className={`space-y-2 select-none ${className}`}>
      {/* Mini Header: Recent 4 indicator */}
      <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
        <span className="flex items-center gap-1.5 uppercase tracking-wider">
          <span className={`w-2 h-2 rounded-full ${isFeedback ? "bg-amber-500" : "bg-blue-500"} animate-pulse`} />
          {isFeedback ? "4 Recent Feedbacks" : "4 Recent Candidates"}
        </span>
        <span className={`text-[10px] font-bold ${isFeedback ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
          {isFeedback ? `${currentAverage || "4.8"}★ Avg` : `${allPassed}P / ${allFailed}F`}
        </span>
      </div>

      {/* Compact 1-line progress ratio meter */}
      {!isFeedback ? (
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-300/50 dark:border-slate-700/50">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${overallPassRatio}%` }}
            title={`Pass Ratio: ${overallPassRatio}%`}
          />
          <div
            className="bg-rose-500 h-full transition-all duration-300"
            style={{ width: `${100 - overallPassRatio}%` }}
            title={`Needs Retest: ${100 - overallPassRatio}%`}
          />
        </div>
      ) : (
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300/50 dark:border-slate-700/50">
          <div
            className="bg-gradient-to-r from-amber-400 to-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (Number(currentAverage || 4.8) / 5) * 100)}%` }}
          />
        </div>
      )}

      {/* Compact Bar Chart Canvas */}
      <div className="relative bg-slate-50/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-2xs">
        {/* Pass rate benchmark 60% line */}
        {!isFeedback && (
          <div
            className="absolute left-2 right-2 border-b border-dashed border-blue-400/50 pointer-events-none z-10 flex items-center justify-end"
            style={{ bottom: "34px" }}
          >
            <span className="text-[8px] font-bold text-blue-600 dark:text-blue-400 bg-white/95 dark:bg-slate-900/95 px-1 py-0.2 rounded border border-blue-200/80 dark:border-blue-800/80 -translate-y-1.5 shadow-2xs">
              60%
            </span>
          </div>
        )}

        {/* 4 Micro Bars with candidate names */}
        <div className="flex items-end justify-between gap-1.5">
          {effectivePoints.map((pt, i) => {
            const isHovered = hoveredIdx === i;

            let pctHeight = 0;
            let isPassed = false;

            if (isFeedback) {
              pctHeight = Math.max(20, Math.min(100, (pt.value / 5.0) * 100));
              isPassed = pt.value >= 3.5;
            } else {
              pctHeight = Math.max(18, Math.min(100, pt.value));
              isPassed = pt.status === "passed" || pt.value >= 60;
            }

            const barGradient = isFeedback
              ? pt.value >= 4.5
                ? "bg-gradient-to-t from-emerald-500 to-teal-400"
                : pt.value >= 3.5
                ? "bg-gradient-to-t from-amber-500 to-yellow-400"
                : "bg-gradient-to-t from-rose-500 to-orange-400"
              : isPassed
              ? "bg-gradient-to-t from-emerald-500 to-teal-400"
              : "bg-gradient-to-t from-rose-500 to-pink-500";

            const displayName = pt.fullName ? pt.fullName.split(" ")[0] : pt.label;

            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="flex-1 flex flex-col items-center group cursor-pointer transition-transform min-w-0"
              >
                {/* Score Number Above Bar */}
                <span
                  className={`text-[9.5px] font-extrabold transition-all leading-none mb-1 truncate ${
                    isHovered
                      ? "scale-105 text-slate-900 dark:text-white"
                      : isPassed
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isFeedback ? `${pt.value}★` : `${pt.value}%`}
                </span>

                {/* Vertical Bar track */}
                <div className="w-full max-w-[26px] h-9 bg-slate-200/80 dark:bg-slate-800/90 rounded-t-md flex items-end p-0.5 relative overflow-hidden shadow-inner">
                  <div
                    className={`w-full rounded-t-sm transition-all duration-300 ${barGradient} ${
                      isHovered ? "brightness-110 ring-1 ring-blue-500" : ""
                    }`}
                    style={{ height: `${pctHeight}%` }}
                  />
                </div>

                {/* Candidate Name Below Bar */}
                <span
                  className={`text-[9.5px] font-bold truncate max-w-[56px] text-center block pt-1 leading-tight transition-colors ${
                    isHovered
                      ? "text-blue-600 dark:text-blue-400 font-extrabold"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                  title={`${pt.fullName || pt.label} (${pt.department || "General"})`}
                >
                  {displayName}
                </span>
              </div>
            );
          })}
        </div>

        {/* Floating Tooltip during Hover */}
        {activeItem && (
          <div className="absolute inset-x-2 bottom-1.5 p-1.5 bg-slate-900/95 text-white dark:bg-white/95 dark:text-slate-900 text-[10px] rounded-lg shadow-lg border border-slate-700 dark:border-slate-300 flex items-center justify-between gap-1 z-20 pointer-events-none">
            <span className="truncate max-w-[90px] font-bold">
              {activeItem.fullName || activeItem.label}
            </span>
            <span className="font-extrabold shrink-0">
              {isFeedback ? `${activeItem.value}★` : `${activeItem.value}% (${activeItem.value >= 60 ? "PASS" : "FAIL"})`}
            </span>
          </div>
        )}
      </div>

      {/* Sublabel matching Card 1 and Card 2's coverage sublabel */}
      <div className="flex items-center justify-between text-[9.5px] text-slate-500 dark:text-slate-400 pt-0.5">
        <span>{isFeedback ? "Satisfaction Rate" : "Passing Benchmark"}</span>
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {isFeedback ? `${Math.round((Number(currentAverage || 4.8) / 5) * 100)}% Positive` : "60% Threshold"}
        </span>
      </div>
    </div>
  );
};
