import React, { useState } from "react";

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
  currentAverage?: string | number;
  totalCount?: number;
  totalPassed?: number;
  totalFailed?: number;
  maxRecent?: number;
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
      <div className="flex items-center justify-between text-[11px] font-bold text-[#403F3E]">
        <span className="flex items-center gap-1.5 uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#008DD2]" />
          {isFeedback ? "4 Recent Feedbacks" : "4 Recent Candidates"}
        </span>
        <span className="text-[10px] font-bold text-[#008DD2]">
          {isFeedback ? `${currentAverage || "4.8"}★ Avg` : `${allPassed}P / ${allFailed}F`}
        </span>
      </div>

      {/* Progress ratio meter */}
      {!isFeedback ? (
        <div className="w-full h-1.5 bg-[#EAEAEA] rounded-full overflow-hidden flex border border-[#D5D4D4]">
          <div
            className="bg-[#008DD2] h-full transition-all duration-300"
            style={{ width: `${overallPassRatio}%` }}
            title={`Pass Ratio: ${overallPassRatio}%`}
          />
          <div
            className="bg-[#757573] h-full transition-all duration-300"
            style={{ width: `${100 - overallPassRatio}%` }}
            title={`Needs Retest: ${100 - overallPassRatio}%`}
          />
        </div>
      ) : (
        <div className="w-full h-1.5 bg-[#EAEAEA] rounded-full overflow-hidden border border-[#D5D4D4]">
          <div
            className="bg-[#008DD2] h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (Number(currentAverage || 4.8) / 5) * 100)}%` }}
          />
        </div>
      )}

      {/* Compact Bar Chart Canvas */}
      <div className="relative bg-[#FFFFFF] border border-[#D5D4D4] rounded-lg p-2 shadow-2xs">
        {/* Pass rate benchmark 60% line */}
        {!isFeedback && (
          <div
            className="absolute left-2 right-2 border-b border-dashed border-[#59B5E2] pointer-events-none z-10 flex items-center justify-end"
            style={{ bottom: "34px" }}
          >
            <span className="text-[8px] font-bold text-[#006393] bg-[#E6F4FA] px-1 py-0.2 rounded border border-[#59B5E2] -translate-y-1.5">
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

            const barColor = isPassed ? "bg-[#008DD2]" : "bg-[#757573]";
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
                  className={`text-[9.5px] font-bold transition-all leading-none mb-1 truncate ${
                    isPassed ? "text-[#008DD2]" : "text-[#757573]"
                  }`}
                >
                  {isFeedback ? `${pt.value}★` : `${pt.value}%`}
                </span>

                {/* Vertical Bar track */}
                <div className="w-full max-w-[26px] h-9 bg-[#EAEAEA] rounded-t-md flex items-end p-0.5 relative overflow-hidden">
                  <div
                    className={`w-full rounded-t-sm transition-all duration-300 ${barColor} ${
                      isHovered ? "brightness-110 ring-1 ring-[#0078B2]" : ""
                    }`}
                    style={{ height: `${pctHeight}%` }}
                  />
                </div>

                {/* Candidate Name Below Bar */}
                <span
                  className={`text-[9.5px] font-semibold truncate max-w-[56px] text-center block pt-1 leading-tight transition-colors ${
                    isHovered ? "text-[#008DD2] font-bold" : "text-[#403F3E]"
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
          <div className="absolute inset-x-2 bottom-1.5 p-1.5 bg-[#2B2A28] text-[#FFFFFF] text-[10px] rounded-md shadow-md border border-[#403F3E] flex items-center justify-between gap-1 z-20 pointer-events-none">
            <span className="truncate max-w-[90px] font-semibold">
              {activeItem.fullName || activeItem.label}
            </span>
            <span className="font-bold shrink-0 text-[#E6F4FA]">
              {isFeedback ? `${activeItem.value}★` : `${activeItem.value}% (${activeItem.value >= 60 ? "PASS" : "FAIL"})`}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[9.5px] text-[#757573] pt-0.5">
        <span>{isFeedback ? "Satisfaction Rate" : "Passing Benchmark"}</span>
        <span className="font-bold text-[#403F3E]">
          {isFeedback ? `${Math.round((Number(currentAverage || 4.8) / 5) * 100)}% Positive` : "60% Threshold"}
        </span>
      </div>
    </div>
  );
};
