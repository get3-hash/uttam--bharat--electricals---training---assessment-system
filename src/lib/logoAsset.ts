/**
 * Official Uttam (Bharat) Electricals Pvt. Ltd. Trademark Logo Asset Provider
 * Provides exact vector geometry matching the official trademark registration:
 * "UTTAM® - POWER AND DISTRIBUTION TRANSFORMERS"
 * (Features the official blue triangle 'A' with internal white lightning & spark line)
 */

export const UTTAM_BRAND_BLUE = "#008DD2"; // Official Uttam Blue (#008DD2)
export const UTTAM_BRAND_DARK = "#2B2A28"; // Official Uttam Charcoal (#2B2A28)
export const UTTAM_BRAND_SLATE = "#403F3E"; // Corporate Charcoal 700

export function getUttamLogoSvg(darkBg = false): string {
  const textColor = darkBg ? "#ffffff" : "#18181b";
  const subtextColor = darkBg ? "#cbd5e1" : "#18181b";
  const blueColor = UTTAM_BRAND_BLUE;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 135" width="480" height="135">
  <!-- Letter U -->
  <path d="M 0,12 L 21,12 L 21,56 C 21,68 28,73 37,73 C 46,73 53,68 53,56 L 53,12 L 74,12 L 74,58 C 74,80 58,90 37,90 C 16,90 0,80 0,58 Z" fill="${textColor}" />

  <!-- First T -->
  <path d="M 81,12 L 155,12 L 155,31 L 129,31 L 129,90 L 107,90 L 107,31 L 81,31 Z" fill="${textColor}" />

  <!-- Second T -->
  <path d="M 162,12 L 236,12 L 236,31 L 210,31 L 210,90 L 188,90 L 188,31 L 162,31 Z" fill="${textColor}" />

  <!-- Letter A: Solid Blue Triangle + White Lightning Bolt + Spark Line -->
  <g id="letter-a">
    <polygon points="280,12 336,90 224,90" fill="${blueColor}" />
    <polygon points="277,22 288,48 278,48 292,76 268,52 278,52" fill="#ffffff" />
    <line x1="244" y1="102" x2="310" y2="-2" stroke="${blueColor}" stroke-width="3.5" stroke-linecap="round" />
  </g>

  <!-- Letter M -->
  <path d="M 345,12 L 366,12 L 390,56 L 414,12 L 435,12 L 435,90 L 415,90 L 415,38 L 390,82 L 365,38 L 365,90 L 345,90 Z" fill="${textColor}" />

  <!-- Registered Trademark (R) -->
  <circle cx="458" cy="22" r="10" stroke="${textColor}" stroke-width="2.2" fill="none" />
  <text x="458" y="26" font-family="Arial, sans-serif" font-weight="bold" font-size="12" fill="${textColor}" text-anchor="middle">R</text>

  <!-- Tagline: POWER AND DISTRIBUTION TRANSFORMERS -->
  <text x="0" y="122" textLength="435" lengthAdjust="spacing" font-family="'Times New Roman', Georgia, serif" font-weight="bold" font-size="20" fill="${subtextColor}">POWER AND DISTRIBUTION TRANSFORMERS</text>
</svg>`;
}

export function getUttamLogoSvgDataUrl(darkBg = false): string {
  const svg = getUttamLogoSvg(darkBg);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

let cachedPngLight: string | null = null;
let cachedPngDark: string | null = null;

/**
 * Renders the official logo SVG to a high-resolution PNG data URL for printing or PDF embedding
 */
export async function getUttamLogoPngDataUrl(darkBg = false, scale = 3): Promise<string> {
  if (darkBg && cachedPngDark) return cachedPngDark;
  if (!darkBg && cachedPngLight) return cachedPngLight;

  if (typeof window === "undefined" || !window.document) {
    return getUttamLogoSvgDataUrl(darkBg);
  }

  return new Promise((resolve) => {
    try {
      const svgString = getUttamLogoSvg(darkBg);
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        try {
          const width = 480 * scale;
          const height = 135 * scale;
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            return resolve(getUttamLogoSvgDataUrl(darkBg));
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          const pngData = canvas.toDataURL("image/png");
          URL.revokeObjectURL(url);

          if (darkBg) {
            cachedPngDark = pngData;
          } else {
            cachedPngLight = pngData;
          }
          resolve(pngData);
        } catch (err) {
          URL.revokeObjectURL(url);
          resolve(getUttamLogoSvgDataUrl(darkBg));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(getUttamLogoSvgDataUrl(darkBg));
      };

      img.src = url;
    } catch (e) {
      resolve(getUttamLogoSvgDataUrl(darkBg));
    }
  });
}
