import React from "react";
import { UTTAM_BRAND_BLUE } from "../lib/logoAsset";

interface CompanyLogoProps {
  variant?: "full" | "compact" | "badge" | "certificate";
  darkBg?: boolean;
  className?: string;
  height?: number | string;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  variant = "full",
  darkBg = false,
  className = "",
  height
}) => {
  const textColor = darkBg ? "#FFFFFF" : "#2B2A28";
  const subtextColor = darkBg ? "#D5D4D4" : "#403F3E";
  const blueColor = UTTAM_BRAND_BLUE; // Official Uttam Blue 500 (#008DD2)

  if (variant === "badge") {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        <svg viewBox="0 0 100 90" className="h-8 w-auto shrink-0">
          {/* Blue Triangle */}
          <polygon points="50,6 94,84 6,84" fill={blueColor} />
          {/* White cutout lightning bolt */}
          <polygon points="48,16 60,42 50,42 66,74 38,48 48,48" fill="#FFFFFF" />
          {/* Spark cut line */}
          <line x1="20" y1="94" x2="80" y2="-4" stroke={blueColor} strokeWidth="4" strokeLinecap="round" />
        </svg>
        <div className="flex flex-col leading-none">
          <div className="flex items-center font-black text-sm tracking-tight" style={{ color: textColor }}>
            <span>UTTAM</span>
            <span className="text-[10px] text-[#008DD2] font-bold ml-0.5">®</span>
          </div>
          <span className="text-[8.5px] uppercase tracking-wider font-bold text-[#008DD2] mt-0.5">
            Transformers
          </span>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <svg
          viewBox="0 0 480 100"
          className="h-8 w-auto block"
          style={{ maxHeight: typeof height === "number" ? `${height}px` : height || "36px" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Letter U: Exact block vector geometry */}
          <path
            d="M 0,12 L 21,12 L 21,56 C 21,68 28,73 37,73 C 46,73 53,68 53,56 L 53,12 L 74,12 L 74,58 C 74,80 58,90 37,90 C 16,90 0,80 0,58 Z"
            fill={textColor}
          />

          {/* First T */}
          <path
            d="M 81,12 L 155,12 L 155,31 L 129,31 L 129,90 L 107,90 L 107,31 L 81,31 Z"
            fill={textColor}
          />

          {/* Second T */}
          <path
            d="M 162,12 L 236,12 L 236,31 L 210,31 L 210,90 L 188,90 L 188,31 L 162,31 Z"
            fill={textColor}
          />

          {/* Letter A (Official Blue Triangle + White Lightning Bolt + Spark Line) */}
          <g id="compact-letter-a">
            <polygon points="280,12 336,90 224,90" fill={blueColor} />
            <polygon points="277,22 288,48 278,48 292,76 268,52 278,52" fill="#ffffff" />
            <line x1="244" y1="102" x2="310" y2="-2" stroke={blueColor} strokeWidth="3.5" strokeLinecap="round" />
          </g>

          {/* Letter M */}
          <path
            d="M 345,12 L 366,12 L 390,56 L 414,12 L 435,12 L 435,90 L 415,90 L 415,38 L 390,82 L 365,38 L 365,90 L 345,90 Z"
            fill={textColor}
          />

          {/* Registered Trademark ® */}
          <g transform="translate(458, 22)">
            <circle cx="0" cy="0" r="10" stroke={textColor} strokeWidth="2.2" fill="none" />
            <text
              x="0"
              y="4.2"
              fontFamily="Arial, sans-serif"
              fontWeight="bold"
              fontSize="12"
              fill={textColor}
              textAnchor="middle"
            >
              R
            </text>
          </g>
        </svg>
      </div>
    );
  }

  if (variant === "certificate") {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <svg
          viewBox="0 0 480 135"
          style={{ height: height || "64px", maxHeight: "80px" }}
          className="w-auto block drop-shadow-sm"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Letter U */}
          <path
            d="M 0,12 L 21,12 L 21,56 C 21,68 28,73 37,73 C 46,73 53,68 53,56 L 53,12 L 74,12 L 74,58 C 74,80 58,90 37,90 C 16,90 0,80 0,58 Z"
            fill={textColor}
          />

          {/* First T */}
          <path
            d="M 81,12 L 155,12 L 155,31 L 129,31 L 129,90 L 107,90 L 107,31 L 81,31 Z"
            fill={textColor}
          />

          {/* Second T */}
          <path
            d="M 162,12 L 236,12 L 236,31 L 210,31 L 210,90 L 188,90 L 188,31 L 162,31 Z"
            fill={textColor}
          />

          {/* Letter A (Official Blue Triangle + White Lightning Bolt + Spark Line) */}
          <g id="cert-letter-a">
            <polygon points="280,12 336,90 224,90" fill={blueColor} />
            <polygon points="277,22 288,48 278,48 292,76 268,52 278,52" fill="#ffffff" />
            <line x1="244" y1="102" x2="310" y2="-2" stroke={blueColor} strokeWidth="3.5" strokeLinecap="round" />
          </g>

          {/* Letter M */}
          <path
            d="M 345,12 L 366,12 L 390,56 L 414,12 L 435,12 L 435,90 L 415,90 L 415,38 L 390,82 L 365,38 L 365,90 L 345,90 Z"
            fill={textColor}
          />

          {/* Registered Trademark ® */}
          <g transform="translate(458, 22)">
            <circle cx="0" cy="0" r="10" stroke={textColor} strokeWidth="2.2" fill="none" />
            <text
              x="0"
              y="4.2"
              fontFamily="Arial, sans-serif"
              fontWeight="bold"
              fontSize="12"
              fill={textColor}
              textAnchor="middle"
            >
              R
            </text>
          </g>

          {/* Subtitle: POWER AND DISTRIBUTION TRANSFORMERS */}
          <text
            x="0"
            y="122"
            textLength="435"
            lengthAdjust="spacing"
            fontFamily="'Times New Roman', Georgia, 'Liberation Serif', serif"
            fontWeight="bold"
            fontSize="21"
            fill={subtextColor}
            letterSpacing="0.5px"
          >
            POWER AND DISTRIBUTION TRANSFORMERS
          </text>
        </svg>
      </div>
    );
  }

  // Default "full" trademark logo with "POWER AND DISTRIBUTION TRANSFORMERS"
  return (
    <div className={`inline-block ${className}`}>
      <svg
        viewBox="0 0 480 135"
        style={{ height: height || "auto" }}
        className="w-full max-w-full h-auto block"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Letter U */}
        <path
          d="M 0,12 L 21,12 L 21,56 C 21,68 28,73 37,73 C 46,73 53,68 53,56 L 53,12 L 74,12 L 74,58 C 74,80 58,90 37,90 C 16,90 0,80 0,58 Z"
          fill={textColor}
        />

        {/* First T */}
        <path
          d="M 81,12 L 155,12 L 155,31 L 129,31 L 129,90 L 107,90 L 107,31 L 81,31 Z"
          fill={textColor}
        />

        {/* Second T */}
        <path
          d="M 162,12 L 236,12 L 236,31 L 210,31 L 210,90 L 188,90 L 188,31 L 162,31 Z"
          fill={textColor}
        />

        {/* Letter A (Official Blue Triangle + White Lightning Bolt + Spark Line) */}
        <g id="full-letter-a">
          <polygon points="280,12 336,90 224,90" fill={blueColor} />
          <polygon points="277,22 288,48 278,48 292,76 268,52 278,52" fill="#ffffff" />
          <line x1="244" y1="102" x2="310" y2="-2" stroke={blueColor} strokeWidth="3.5" strokeLinecap="round" />
        </g>

        {/* Letter M */}
        <path
          d="M 345,12 L 366,12 L 390,56 L 414,12 L 435,12 L 435,90 L 415,90 L 415,38 L 390,82 L 365,38 L 365,90 L 345,90 Z"
          fill={textColor}
        />

        {/* Registered Trademark ® */}
        <g transform="translate(458, 22)">
          <circle cx="0" cy="0" r="10" stroke={textColor} strokeWidth="2.2" fill="none" />
          <text
            x="0"
            y="4.2"
            fontFamily="Arial, sans-serif"
            fontWeight="bold"
            fontSize="12"
            fill={textColor}
            textAnchor="middle"
          >
            R
          </text>
        </g>

        {/* Subtitle: POWER AND DISTRIBUTION TRANSFORMERS */}
        <text
          x="0"
          y="122"
          textLength="435"
          lengthAdjust="spacing"
          fontFamily="'Times New Roman', Georgia, 'Liberation Serif', serif"
          fontWeight="bold"
          fontSize="21"
          fill={subtextColor}
          letterSpacing="0.5px"
        >
          POWER AND DISTRIBUTION TRANSFORMERS
        </text>
      </svg>
    </div>
  );
};
