import QRCode from "qrcode";
import { getUttamLogoSvg, getUttamLogoPngDataUrl } from "./logoAsset";

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
  preferPng?: boolean;
}

export interface TrainingStandeeData {
  id: string;
  title: string;
  department?: string;
  trainerName?: string;
  trainingDate?: string;
  description?: string;
  qrCodeDataUrl?: string;
}

/**
 * Generates a high-reliability QR code for employee training registration.
 * Generates high-res PNG or SVG data URL with fallback online generators.
 */
export async function generateTrainingQRCode(
  trainingId: string,
  options?: QRCodeOptions
): Promise<string> {
  const origin =
    typeof window !== "undefined" && window.location && window.location.origin && window.location.origin !== "null"
      ? window.location.origin
      : "http://localhost:3000";

  const targetUrl = `${origin}/employee/register/${trainingId}`;
  const width = options?.width || 512;
  const margin = options?.margin !== undefined ? options?.margin : 2;
  const darkColor = options?.darkColor || "#0F2942"; // Uttam Corporate Navy
  const lightColor = options?.lightColor || "#FFFFFF";
  const preferPng = options?.preferPng !== undefined ? options?.preferPng : true;

  // Robust resolve of qrcode module across ESM / CJS / Vite bundling
  const qr = (QRCode as any)?.default || QRCode;

  // Strategy 1: High-res Canvas PNG Data URL (if preferPng is true)
  if (preferPng && qr && typeof qr.toDataURL === "function") {
    try {
      const dataUrl = await qr.toDataURL(targetUrl, {
        width,
        margin,
        color: {
          dark: darkColor,
          light: lightColor
        }
      });
      if (dataUrl && dataUrl.startsWith("data:image/png")) {
        return dataUrl;
      }
    } catch (err) {
      console.warn("QRCode canvas toDataURL notice:", err);
    }
  }

  // Strategy 2: SVG Data URL via QRCode.toString
  try {
    if (qr && typeof qr.toString === "function") {
      const svgString = await qr.toString(targetUrl, {
        type: "svg",
        width,
        margin,
        color: {
          dark: darkColor,
          light: lightColor
        }
      });
      if (svgString && svgString.includes("<svg")) {
        // If PNG was requested, try converting SVG to PNG via offscreen canvas
        if (preferPng && typeof document !== "undefined") {
          try {
            const pngDataUrl = await convertSvgToPng(`data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`, width, width);
            if (pngDataUrl) return pngDataUrl;
          } catch (_) {}
        }
        return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
      }
    }
  } catch (err) {
    console.warn("QRCode SVG generation notice:", err);
  }

  // Strategy 3: Fallback PNG Data URL via QRCode.toDataURL
  try {
    if (qr && typeof qr.toDataURL === "function") {
      const dataUrl = await qr.toDataURL(targetUrl, {
        width,
        margin,
        color: {
          dark: darkColor,
          light: lightColor
        }
      });
      if (dataUrl && dataUrl.startsWith("data:image")) {
        return dataUrl;
      }
    }
  } catch (err) {
    console.warn("QRCode canvas toDataURL notice:", err);
  }

  // Strategy 4: Online QuickChart QR Generator Service
  try {
    const encodedUrl = encodeURIComponent(targetUrl);
    const cleanHex = darkColor.replace("#", "");
    return `https://quickchart.io/qr?text=${encodedUrl}&size=${width}&dark=${cleanHex}&margin=${margin}`;
  } catch (e) {
    console.warn("Quickchart QR fallback notice:", e);
  }

  // Strategy 5: QRServer API Service
  const encodedUrl = encodeURIComponent(targetUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${width}x${width}&data=${encodedUrl}&color=${darkColor.replace("#", "")}`;
}

/**
 * Helper to convert SVG data URL to clean PNG raster URL
 */
function convertSvgToPng(svgDataUrl: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(svgDataUrl);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        resolve(svgDataUrl);
      }
    };
    img.onerror = () => resolve(svgDataUrl);
    img.src = svgDataUrl;
  });
}

/**
 * Downloads a high-resolution standalone PNG QR code
 */
export async function downloadQRCodePNG(trainingId: string, trainingTitle: string, width = 800): Promise<void> {
  const qrUrl = await generateTrainingQRCode(trainingId, { width, preferPng: true, margin: 2 });
  const cleanTitle = (trainingTitle || "Training").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40);

  // If already a base64 PNG, download directly
  if (qrUrl.startsWith("data:image/png")) {
    triggerDownload(qrUrl, `${cleanTitle}_QR_Code.png`);
    return;
  }

  // If SVG or external URL, render to canvas first
  const rasterUrl = await convertSvgToPng(qrUrl, width, width);
  triggerDownload(rasterUrl, `${cleanTitle}_QR_Code.png`);
}

/**
 * Triggers a browser file download
 */
function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
  }, 300);
}

/**
 * Generates and prints an official, print-optimized A4 Training Standee flyer
 * Directs employees to scan and register. Uses an isolated hidden iframe for 100% popup-safe printing.
 */
export async function printTrainingQRStandee(training: TrainingStandeeData): Promise<void> {
  const origin =
    typeof window !== "undefined" && window.location && window.location.origin && window.location.origin !== "null"
      ? window.location.origin
      : "http://localhost:3000";

  const targetUrl = `${origin}/employee/register/${training.id}`;
  
  // Ensure we have a high-res PNG
  const qrUrl = await generateTrainingQRCode(training.id, {
    width: 600,
    preferPng: true,
    darkColor: "#0F2942",
    margin: 2
  });

  const department = training.department || "All Departments";
  const trainer = training.trainerName || "Internal Trainer";
  const date = training.trainingDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const title = training.title || "Employee Training Session";

  const printHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Training Standee - ${title}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    body {
      background: #ffffff;
      color: #0f172a;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 10px;
    }
    .standee-card {
      width: 100%;
      max-width: 680px;
      border: 3px solid #0f2942;
      border-radius: 20px;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 10px 25px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
    }
    .header-banner {
      background: linear-gradient(135deg, #0f2942 0%, #1e3a8a 100%);
      color: #ffffff;
      text-align: center;
      padding: 20px 20px 16px;
      border-bottom: 4px solid #009fe3;
    }
    .logo-container {
      max-width: 220px;
      margin: 0 auto 10px;
    }
    .logo-container svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .company-title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .company-sub {
      font-size: 10.5px;
      font-weight: 600;
      color: #7dd3fc;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .content-body {
      padding: 24px 28px;
      text-align: center;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .portal-tag {
      display: inline-block;
      background: #f1f5f9;
      color: #1e3a8a;
      border: 1px solid #cbd5e1;
      padding: 5px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .training-title {
      font-size: 26px;
      font-weight: 900;
      color: #0f2942;
      line-height: 1.25;
      margin-bottom: 14px;
      max-width: 580px;
    }
    .meta-pills {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
      margin-bottom: 22px;
    }
    .pill {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      color: #334155;
    }
    .pill strong {
      color: #0f2942;
      font-weight: 700;
    }
    .qr-frame {
      background: #ffffff;
      border: 3px solid #1e3a8a;
      border-radius: 18px;
      padding: 14px;
      display: inline-block;
      box-shadow: 0 8px 20px rgba(30, 58, 138, 0.12);
      margin-bottom: 16px;
    }
    .qr-img {
      width: 240px;
      height: 240px;
      display: block;
      object-fit: contain;
    }
    .scan-notice {
      font-size: 16px;
      font-weight: 800;
      color: #b45309;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .url-box {
      background: #f1f5f9;
      border: 1px dashed #94a3b8;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 10.5px;
      color: #475569;
      font-family: monospace;
      word-break: break-all;
      margin-bottom: 20px;
      max-width: 520px;
    }
    .instructions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      width: 100%;
      margin-top: 6px;
      border-top: 1px solid #e2e8f0;
      padding-top: 18px;
      text-align: left;
    }
    .step-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
    }
    .step-num {
      display: inline-block;
      background: #0f2942;
      color: #ffffff;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      text-align: center;
      line-height: 22px;
      font-size: 11px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .step-title {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .step-desc {
      font-size: 10px;
      color: #64748b;
      line-height: 1.35;
    }
    .footer-bar {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 12px 20px;
      text-align: center;
      font-size: 10.5px;
      color: #64748b;
      font-weight: 600;
    }
    @media print {
      body {
        padding: 0;
      }
      .standee-card {
        border-width: 2px;
        box-shadow: none;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="standee-card">
    <div class="header-banner">
      <div class="logo-container">
        ${getUttamLogoSvg(true)}
      </div>
      <div class="company-title">UTTAM (BHARAT) ELECTRICALS PVT. LTD.</div>
      <div class="company-sub">JAIPUR, RAJASTHAN &bull; ESTD 1983 &bull; ISO 9001:2015</div>
    </div>

    <div class="content-body">
      <div class="portal-tag">Official Training Registration & Assessment Portal</div>
      <h1 class="training-title">${escapeHtml(title)}</h1>

      <div class="meta-pills">
        <div class="pill">Department: <strong>${escapeHtml(department)}</strong></div>
        <div class="pill">Trainer: <strong>${escapeHtml(trainer)}</strong></div>
        <div class="pill">Date: <strong>${escapeHtml(date)}</strong></div>
      </div>

      <div class="qr-frame">
        <img class="qr-img" src="${qrUrl}" alt="Training QR Code" />
      </div>

      <div class="scan-notice">
        <span>📷 Scan With Smartphone Camera to Register</span>
      </div>

      <div class="url-box">
        Registration URL: <strong>${escapeHtml(targetUrl)}</strong>
      </div>

      <div class="instructions-grid">
        <div class="step-card">
          <div class="step-num">1</div>
          <div class="step-title">Scan QR Code</div>
          <div class="step-desc">Open phone camera or Google Lens and point at this code. No app login required.</div>
        </div>
        <div class="step-card">
          <div class="step-num">2</div>
          <div class="step-title">Register Details</div>
          <div class="step-desc">Enter your Employee Code, Name, Department & Designation to mark attendance.</div>
        </div>
        <div class="step-card">
          <div class="step-num">3</div>
          <div class="step-title">Quiz & Feedback</div>
          <div class="step-desc">Complete the assessment quiz after the session and submit training feedback.</div>
        </div>
      </div>
    </div>

    <div class="footer-bar">
      Internal Competency & Quality Development Portal &bull; Uttam (Bharat) Electricals Pvt. Ltd.
    </div>
  </div>
</body>
</html>
  `;

  // Hidden print iframe implementation (works reliably inside sandboxed iframes & avoids popup blockers)
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.zIndex = "-999";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("Could not access print frame");
  }

  doc.open();
  doc.write(printHtml);
  doc.close();

  // Wait for images to load inside iframe, then trigger print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Print trigger notice:", e);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  }, 500);
}

/**
 * Renders a full branded training standee poster onto a high-res HTML5 canvas and downloads as PNG
 */
export async function downloadTrainingStandeePNG(training: TrainingStandeeData): Promise<void> {
  const origin =
    typeof window !== "undefined" && window.location && window.location.origin && window.location.origin !== "null"
      ? window.location.origin
      : "http://localhost:3000";

  const targetUrl = `${origin}/employee/register/${training.id}`;
  const qrUrl = await generateTrainingQRCode(training.id, {
    width: 600,
    preferPng: true,
    darkColor: "#0F2942",
    margin: 2
  });

  const department = training.department || "All Departments";
  const trainer = training.trainerName || "Internal Trainer";
  const date = training.trainingDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const title = training.title || "Employee Training Session";

  // Canvas Dimensions: 900 x 1280 (High resolution 3:4 portrait poster)
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, 900, 1280);

  // Outer Border
  ctx.strokeStyle = "#0F2942";
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 880, 1260);

  // Header Banner
  const grad = ctx.createLinearGradient(0, 15, 900, 155);
  grad.addColorStop(0, "#0F2942");
  grad.addColorStop(1, "#1E3A8A");
  ctx.fillStyle = grad;
  ctx.fillRect(15, 15, 870, 145);

  // Electric Blue accent strip below header
  ctx.fillStyle = "#009FE3";
  ctx.fillRect(15, 160, 870, 8);

  // Load and draw official logo
  try {
    const logoPngUrl = await getUttamLogoPngDataUrl(true, 2);
    if (logoPngUrl) {
      await new Promise<void>((res) => {
        const lImg = new Image();
        lImg.onload = () => {
          const lW = 220;
          const lH = (lW * 135) / 480;
          ctx.drawImage(lImg, (900 - lW) / 2, 25, lW, lH);
          res();
        };
        lImg.onerror = () => res();
        lImg.src = logoPngUrl;
      });
    }
  } catch (_) {}

  // Company Name
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 23px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("UTTAM (BHARAT) ELECTRICALS PVT. LTD.", 450, 120);

  // Subtitle
  ctx.fillStyle = "#7DD3FC";
  ctx.font = "bold 12.5px sans-serif";
  ctx.fillText("ESTD 1983 • JAIPUR, RAJASTHAN • ISO 9001:2015 CERTIFIED", 450, 144);

  // Portal Badge Pill
  ctx.fillStyle = "#EEF2FF";
  roundRect(ctx, 220, 185, 460, 36, 18, true, false);
  ctx.fillStyle = "#1E3A8A";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("OFFICIAL TRAINING REGISTRATION & ASSESSMENT PORTAL", 450, 208);

  // Training Title (wrapped if long)
  ctx.fillStyle = "#0F2942";
  ctx.font = "bold 32px sans-serif";
  const words = title.split(" ");
  let line = "";
  let y = 265;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 780 && n > 0) {
      ctx.fillText(line.trim(), 450, y);
      line = words[n] + " ";
      y += 42;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), 450, y);

  // Meta pills (Department | Trainer | Date)
  y += 35;
  ctx.fillStyle = "#F8FAFC";
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 80, y, 740, 52, 10, true, true);

  ctx.fillStyle = "#334155";
  ctx.font = "16px sans-serif";
  ctx.fillText(
    `Dept: ${department}   |   Trainer: ${trainer}   |   Date: ${date}`,
    450,
    y + 32
  );

  // QR Code Frame
  const qrBoxY = y + 80;
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#1E3A8A";
  ctx.lineWidth = 4;
  roundRect(ctx, 260, qrBoxY, 380, 380, 24, true, true);

  // Load and Draw QR Code Image
  const qrImg = new Image();
  qrImg.crossOrigin = "anonymous";
  await new Promise<void>((resolve) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = () => resolve();
    qrImg.src = qrUrl;
  });

  try {
    ctx.drawImage(qrImg, 285, qrBoxY + 25, 330, 330);
  } catch (_) {}

  // Scan Notice
  const scanY = qrBoxY + 420;
  ctx.fillStyle = "#B45309";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("📷 Scan with Phone Camera to Register Directly", 450, scanY);

  // Registration URL box
  const urlBoxY = scanY + 20;
  ctx.fillStyle = "#F1F5F9";
  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = 1;
  roundRect(ctx, 120, urlBoxY, 660, 42, 8, true, true);
  ctx.fillStyle = "#475569";
  ctx.font = "14px monospace";
  ctx.fillText(`URL: ${targetUrl}`, 450, urlBoxY + 26);

  // 3-Step Instruction Cards
  const stepY = urlBoxY + 68;
  const colW = 230;
  const colGap = 20;
  const startX = 85;

  const steps = [
    { num: "1", title: "Scan QR Code", desc: "Open mobile camera or Google Lens and point at this code." },
    { num: "2", title: "Fill Details", desc: "Enter your Employee Code, Name & Department to mark attendance." },
    { num: "3", title: "Quiz & Feedback", desc: "Take the training quiz assessment and share session feedback." }
  ];

  for (let i = 0; i < 3; i++) {
    const s = steps[i];
    const sx = startX + i * (colW + colGap);
    ctx.fillStyle = "#F8FAFC";
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1.5;
    roundRect(ctx, sx, stepY, colW, 95, 12, true, true);

    // Number circle
    ctx.fillStyle = "#0F2942";
    ctx.beginPath();
    ctx.arc(sx + 24, stepY + 24, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(s.num, sx + 24, stepY + 29);

    // Step Title
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(s.title, sx + 46, stepY + 28);

    // Step Desc
    ctx.fillStyle = "#64748B";
    ctx.font = "11.5px sans-serif";
    wrapText(ctx, s.desc, sx + 12, stepY + 54, colW - 24, 16);
  }

  // Footer bar
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(15, 1215, 870, 50);
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(15, 1215);
  ctx.lineTo(885, 1215);
  ctx.stroke();

  ctx.fillStyle = "#64748B";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Internal Competency & Quality Development Portal • Uttam (Bharat) Electricals Pvt. Ltd.", 450, 1245);

  const cleanTitle = (training.title || "Training").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40);
  triggerDownload(canvas.toDataURL("image/png"), `${cleanTitle}_Standee_Poster.png`);
}

/**
 * Helper to draw rounded rectangle on canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill = true,
  stroke = true
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/**
 * Helper to wrap text on canvas
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y);
}

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

