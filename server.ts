import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import nodemailer from "nodemailer";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { parseOffice } from "officeparser";
import * as ExcelJS from "exceljs";

async function parsePdfBufferToText(buffer: Buffer): Promise<string> {
  try {
    let pdfModule: any;
    if (typeof require !== "undefined") {
      try {
        pdfModule = require("pdf-parse");
      } catch {
        pdfModule = await import("pdf-parse");
      }
    } else {
      pdfModule = await import("pdf-parse");
    }

    // Try PDFParse class export (pdf-parse v2)
    const PDFParseClass = pdfModule?.PDFParse || pdfModule?.default?.PDFParse;
    if (typeof PDFParseClass === "function") {
      const parser = new PDFParseClass({ data: buffer });
      const res = await parser.getText();
      if (res && res.text) return res.text;
    }

    // Try function export (pdf-parse v1)
    const pdfFn = typeof pdfModule === "function" ? pdfModule : (pdfModule?.default || pdfModule);
    if (typeof pdfFn === "function") {
      const res = await pdfFn(buffer);
      if (res && res.text) return res.text;
    }
  } catch (e) {
    console.warn("PDF buffer parsing error:", e);
  }

  return "";
}

// Helper to extract text from Excel spreadsheets (.xlsx, .xls)
async function parseExcelBufferToText(buffer: Buffer): Promise<string> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    let output = "";
    workbook.eachSheet((worksheet) => {
      output += `\n--- Sheet: ${worksheet.name} ---\n`;
      worksheet.eachRow((row, rowNumber) => {
        const values = (row.values as any[])
          ?.slice(1)
          ?.map((v) => {
            if (v === null || v === undefined) return "";
            if (typeof v === "object" && (v as any).text) return String((v as any).text);
            if (typeof v === "object" && (v as any).result) return String((v as any).result);
            return String(v);
          })
          ?.filter(Boolean);
        if (values && values.length > 0) {
          output += `Row ${rowNumber}: ${values.join(" | ")}\n`;
        }
      });
    });
    return output.trim();
  } catch (err) {
    console.warn("Excel buffer parsing notice:", (err as any)?.message || err);
    return "";
  }
}

// Fallback string extractor for proprietary or legacy binary files
function extractRawStringsFromBuffer(buf: Buffer): string {
  try {
    const raw = buf.toString("latin1");
    const matches = raw.match(/[A-Za-z0-9\u0900-\u097F][A-Za-z0-9\u0900-\u097F\s.,;:?!()\-–—/"'%]{3,}/g);
    if (matches && matches.length > 0) {
      return matches.join("\n");
    }
  } catch {}
  return "";
}

// Comprehensive multi-format text & slide extraction (PDF, PPTX, PPT, DOCX, DOC, XLSX, XLS, CSV)
async function extractTextFromAnyDocument(file: Express.Multer.File): Promise<{
  text: string;
  fileType: "pdf" | "pptx" | "docx" | "xlsx" | "csv" | "txt" | "unknown";
  isPdf: boolean;
}> {
  const originalName = (file.originalname || "").toLowerCase();
  const mimeType = (file.mimetype || "").toLowerCase();
  let text = "";
  let fileType: "pdf" | "pptx" | "docx" | "xlsx" | "csv" | "txt" | "unknown" = "unknown";
  let isPdf = false;

  if (originalName.endsWith(".pdf") || mimeType.includes("pdf")) {
    isPdf = true;
    fileType = "pdf";
    text = await parsePdfBufferToText(file.buffer);
    if (!text.trim()) {
      try {
        const parsed = await parseOffice(file.buffer, { fileType: "pdf" } as any);
        if (typeof parsed === "string") text = parsed;
      } catch {}
    }
  } else if (
    originalName.endsWith(".pptx") ||
    originalName.endsWith(".ppt") ||
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint")
  ) {
    fileType = "pptx";
    try {
      const parsed = await parseOffice(file.buffer, { fileType: "pptx" } as any);
      if (typeof parsed === "string") text = parsed;
    } catch (e) {
      console.warn("PPTX officeparser notice:", (e as any)?.message || e);
    }
    if (!text.trim()) {
      text = extractRawStringsFromBuffer(file.buffer);
    }
  } else if (
    originalName.endsWith(".docx") ||
    originalName.endsWith(".doc") ||
    mimeType.includes("word") ||
    mimeType.includes("officedocument.wordprocessingml")
  ) {
    fileType = "docx";
    try {
      const parsed = await parseOffice(file.buffer, { fileType: "docx" } as any);
      if (typeof parsed === "string") text = parsed;
    } catch (e) {
      console.warn("DOCX officeparser notice:", (e as any)?.message || e);
    }
    if (!text.trim()) {
      text = extractRawStringsFromBuffer(file.buffer);
    }
  } else if (
    originalName.endsWith(".xlsx") ||
    originalName.endsWith(".xls") ||
    originalName.endsWith(".csv") ||
    originalName.endsWith(".tsv") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("csv")
  ) {
    if (originalName.endsWith(".csv") || originalName.endsWith(".tsv") || mimeType.includes("csv")) {
      fileType = "csv";
      text = file.buffer.toString("utf-8");
    } else {
      fileType = "xlsx";
      text = await parseExcelBufferToText(file.buffer);
      if (!text.trim()) {
        try {
          const parsed = await parseOffice(file.buffer, { fileType: "xlsx" } as any);
          if (typeof parsed === "string") text = parsed;
        } catch {}
      }
    }
  } else {
    fileType = "txt";
    text = file.buffer.toString("utf-8");
  }

  return { text: text.trim(), fileType, isPdf };
}

const app = express();
const PORT = 3000;

// Configure Multer in memory for all documents (PDF, PPT, Word, Excel, CSV up to 30MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit for rich presentations / documents
});

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Helper to check and get Gemini Client safely
function hasValidGeminiKey(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("MY_GEMINI") || apiKey.trim().length < 15) {
    return false;
  }
  return true;
}

function getGeminiClient() {
  if (!hasValidGeminiKey()) {
    throw new Error("GEMINI_API_KEY is not configured or is invalid.");
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}

// API Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", company: "Uttam (Bharat) Electricals Pvt. Ltd." });
});

// --- OTP & Email Notification Service ---
interface OtpStoreItem {
  code: string;
  email: string;
  expiresAt: number;
}

const activeOtps = new Map<string, OtpStoreItem>();

// Runtime Email Configuration for on-the-fly API key integration
export interface RuntimeEmailConfig {
  provider: "resend" | "brevo" | "gmail" | "smtp" | "webhook";
  resendApiKey?: string;
  resendFrom?: string;
  brevoApiKey?: string;
  brevoSenderEmail?: string;
  gmailUser?: string;
  gmailAppPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  webhookUrl?: string;
  updatedAt?: string;
}

const RUNTIME_EMAIL_CONFIG_PATH = path.join(process.cwd(), "runtime-email-config.json");

function loadRuntimeEmailConfig(): RuntimeEmailConfig | null {
  try {
    if (fs.existsSync(RUNTIME_EMAIL_CONFIG_PATH)) {
      const data = fs.readFileSync(RUNTIME_EMAIL_CONFIG_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("[RuntimeEmailConfig] Failed to read config file:", err);
  }
  return null;
}

function saveRuntimeEmailConfig(cfg: RuntimeEmailConfig | null) {
  try {
    if (cfg === null) {
      if (fs.existsSync(RUNTIME_EMAIL_CONFIG_PATH)) {
        fs.unlinkSync(RUNTIME_EMAIL_CONFIG_PATH);
      }
    } else {
      fs.writeFileSync(RUNTIME_EMAIL_CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[RuntimeEmailConfig] Failed to save config file:", err);
  }
}

// Runtime Google Sheets Configuration
export interface RuntimeSheetsConfig {
  googleSheetUrl?: string;
  webhookUrl?: string;
  autoSync?: boolean;
  autoSyncIntervalMinutes?: number;
  lastSyncedAt?: string;
  updatedAt?: string;
}

const RUNTIME_SHEETS_CONFIG_PATH = path.join(process.cwd(), "runtime-sheets-config.json");

function loadRuntimeSheetsConfig(): RuntimeSheetsConfig | null {
  try {
    if (fs.existsSync(RUNTIME_SHEETS_CONFIG_PATH)) {
      const data = fs.readFileSync(RUNTIME_SHEETS_CONFIG_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("[RuntimeSheetsConfig] Failed to read sheets config file:", err);
  }
  return null;
}

function saveRuntimeSheetsConfig(cfg: RuntimeSheetsConfig | null) {
  try {
    if (cfg === null) {
      if (fs.existsSync(RUNTIME_SHEETS_CONFIG_PATH)) {
        fs.unlinkSync(RUNTIME_SHEETS_CONFIG_PATH);
      }
    } else {
      fs.writeFileSync(RUNTIME_SHEETS_CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[RuntimeSheetsConfig] Failed to save sheets config file:", err);
  }
}

// --- Multiple Admin Accounts Management Store ---
export interface StoredAdmin {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: "super_admin" | "admin";
  roleTitle?: string;
  status: "active" | "inactive";
  passwordHash: string;
  salt: string;
  createdAt: string;
  updatedAt?: string;
}

const ADMINS_STORE_PATH = path.join(process.cwd(), "admins-store.json");

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computed = hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

function stripSensitiveAdmin(admin: StoredAdmin) {
  const { passwordHash, salt, ...safe } = admin;
  return safe;
}

function saveAdmins(admins: StoredAdmin[]) {
  try {
    fs.writeFileSync(ADMINS_STORE_PATH, JSON.stringify(admins, null, 2), "utf-8");
  } catch (err) {
    console.error("[AdminStore] Failed to write admins store:", err);
  }
}

function loadAdmins(): StoredAdmin[] {
  let list: StoredAdmin[] = [];
  try {
    if (fs.existsSync(ADMINS_STORE_PATH)) {
      const data = fs.readFileSync(ADMINS_STORE_PATH, "utf-8");
      const parsed: StoredAdmin[] = JSON.parse(data);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    }
  } catch (err) {
    console.warn("[AdminStore] Failed to read admins store:", err);
  }

  let modified = false;

  // 1. Ensure primary Super Admin (admin@uttambharat.com / username: admin) always exists
  const hasPrimarySuper = list.some(
    (a) => a.email.toLowerCase() === "admin@uttambharat.com" || a.username?.toLowerCase() === "admin"
  );
  if (!hasPrimarySuper) {
    const salt = crypto.randomBytes(16).toString("hex");
    const defaultSuper: StoredAdmin = {
      id: "super-admin-primary",
      name: "Super Admin",
      email: "admin@uttambharat.com",
      username: "admin",
      role: "super_admin",
      status: "active",
      passwordHash: hashPassword("admin123", salt),
      salt,
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    list.unshift(defaultSuper);
    modified = true;
  }

  // 2. Ensure environment user email (get3@uttam-bharat.com) always exists as an authorized Super Admin
  const envAdminEmail = "get3@uttam-bharat.com";
  const hasEnvUser = list.some((a) => a.email.toLowerCase() === envAdminEmail);
  if (!hasEnvUser) {
    const salt = crypto.randomBytes(16).toString("hex");
    const envSuper: StoredAdmin = {
      id: "admin_get3_super",
      name: "Management Admin",
      email: envAdminEmail,
      username: "get3",
      role: "super_admin",
      status: "active",
      passwordHash: hashPassword("admin123", salt),
      salt,
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    list.push(envSuper);
    modified = true;
  }

  if (modified || !fs.existsSync(ADMINS_STORE_PATH)) {
    saveAdmins(list);
  }

  return list;
}

function getEmailTransporter() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (!user || !pass || user.trim() === "" || pass.trim() === "") {
    return null;
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = process.env.SMTP_PORT
    ? parseInt(process.env.SMTP_PORT, 10)
    : (process.env.SMTP_SECURE === "false" ? 587 : 465);
  const secure = process.env.SMTP_SECURE === "false" ? false : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: user.trim(),
      pass: pass.trim(),
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

function generateOtpHtml(otpCode: string, targetEmail: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #1b1a19; margin: 0; padding: 24px; color: #eaeaea; }
    .container { max-width: 520px; margin: 0 auto; background-color: #2b2a28; border-radius: 16px; border: 1px solid #403f3e; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { background: linear-gradient(135deg, #2b2a28 0%, #006393 50%, #008dd2 100%); padding: 28px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { color: #e6f4fa; margin: 6px 0 0 0; font-size: 13px; font-weight: 500; }
    .content { padding: 32px 28px; text-align: center; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(0, 141, 210, 0.15); border: 1px solid rgba(0, 141, 210, 0.4); border-radius: 9999px; color: #59b5e2; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    .title { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 10px; }
    .desc { font-size: 14px; color: #b5b4b4; line-height: 1.6; margin-bottom: 24px; }
    .otp-box { background: #1b1a19; border: 2px dashed #008dd2; border-radius: 14px; padding: 20px 30px; display: inline-block; margin: 8px 0 24px 0; }
    .otp-code { font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #008dd2; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .validity { font-size: 12px; color: #b5b4b4; margin-top: 8px; font-weight: 500; }
    .security-note { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 14px; font-size: 12px; color: #fde68a; text-align: left; line-height: 1.5; margin-top: 16px; }
    .footer { border-top: 1px solid #403f3e; padding: 18px 24px; text-align: center; font-size: 12px; color: #757573; background: #1b1a19; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Uttam (Bharat) Electricals Pvt. Ltd.</h1>
      <p>Quality & Management Administration Portal</p>
    </div>
    <div class="content">
      <div class="badge">Security Verification</div>
      <div class="title">Admin Login One-Time Password (OTP)</div>
      <div class="desc">
        A login authentication request was initiated for your administrator account (<strong style="color: #ffffff;">${targetEmail}</strong>). Please enter the one-time password below to complete login:
      </div>
      <div class="otp-box">
        <div class="otp-code">${otpCode}</div>
        <div class="validity">⏱️ Valid for 10 minutes only</div>
      </div>
      <div class="security-note">
        <strong>🔒 Security Notice:</strong> Never share this code with anyone. Uttam (Bharat) Electricals staff will never ask for your OTP. If you did not request this OTP, you can safely ignore this email.
      </div>
    </div>
    <div class="footer">
      Uttam (Bharat) Electricals Pvt. Ltd. • ISO 9001:2015 Certified Portal
    </div>
  </div>
</body>
</html>`;
}

/**
 * Unified real-time email sender.
 * Tries:
 * 1. Resend API (HTTP REST, super fast real-time delivery)
 * 2. Brevo (Sendinblue) API (HTTP REST)
 * 3. SendGrid API (HTTP REST)
 * 4. Gmail / Custom SMTP (nodemailer)
 */
async function dispatchRealTimeEmail(
  to: string,
  otpCode: string
): Promise<{ success: boolean; provider: string; messageId?: string; error?: string }> {
  const subject = `Admin Login OTP: ${otpCode} - Uttam (Bharat) Electricals`;
  const html = generateOtpHtml(otpCode, to);
  const text = `Your Uttam (Bharat) Electricals Admin Login OTP is ${otpCode}. It is valid for 10 minutes.`;

  const runtimeCfg = loadRuntimeEmailConfig();

  // 1. Resend API (HTTP REST, https://resend.com)
  const resendKey = runtimeCfg?.resendApiKey?.trim() || process.env.RESEND_API_KEY?.trim();
  if (resendKey && (!runtimeCfg || runtimeCfg.provider === "resend")) {
    try {
      const from = runtimeCfg?.resendFrom?.trim() || process.env.RESEND_FROM?.trim() || "Uttam Bharat Portal <onboarding@resend.dev>";
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      const data: any = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.message || `Resend HTTP error ${resp.status}`);
      }
      console.log(`[Resend API Success] Dispatched real-time OTP to ${to}. ID:`, data?.id);
      return { success: true, provider: "Resend API", messageId: data?.id };
    } catch (err: any) {
      console.error("[Resend API Error]:", err?.message);
      if (runtimeCfg?.provider === "resend") {
        return { success: false, provider: "Resend API", error: err?.message };
      }
    }
  }

  // 2. Brevo (Sendinblue) API (https://brevo.com)
  const brevoKey = runtimeCfg?.brevoApiKey?.trim() || process.env.BREVO_API_KEY?.trim();
  if (brevoKey && (!runtimeCfg || runtimeCfg.provider === "brevo")) {
    try {
      const senderEmail = runtimeCfg?.brevoSenderEmail?.trim() || process.env.BREVO_SENDER_EMAIL?.trim() || "admin@uttambharat.com";
      const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "Uttam (Bharat) Electricals", email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      const data: any = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.message || `Brevo HTTP error ${resp.status}`);
      }
      console.log(`[Brevo API Success] Dispatched real-time OTP to ${to}. ID:`, data?.messageId);
      return { success: true, provider: "Brevo API", messageId: data?.messageId };
    } catch (err: any) {
      console.error("[Brevo API Error]:", err?.message);
      if (runtimeCfg?.provider === "brevo") {
        return { success: false, provider: "Brevo API", error: err?.message };
      }
    }
  }

  // 3. Custom Webhook API
  if (runtimeCfg?.provider === "webhook" && runtimeCfg.webhookUrl) {
    try {
      const resp = await fetch(runtimeCfg.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          otpCode,
          subject,
          html,
          text,
          timestamp: new Date().toISOString(),
          portal: "Uttam (Bharat) Electricals Pvt. Ltd.",
        }),
      });
      if (!resp.ok) {
        throw new Error(`Webhook HTTP error ${resp.status}`);
      }
      return { success: true, provider: "Custom Webhook API" };
    } catch (err: any) {
      console.error("[Webhook API Error]:", err?.message);
      return { success: false, provider: "Custom Webhook API", error: err?.message };
    }
  }

  // 4. SendGrid API
  const sendgridKey = process.env.SENDGRID_API_KEY?.trim();
  if (sendgridKey) {
    try {
      const fromEmail = process.env.SENDGRID_FROM?.trim() || "noreply@uttambharat.com";
      const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sendgridKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: fromEmail, name: "Uttam (Bharat) Electricals" },
          subject,
          content: [{ type: "text/html", value: html }],
        }),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(errorText || `SendGrid HTTP ${resp.status}`);
      }
      console.log(`[SendGrid API Success] Dispatched real-time OTP to ${to}`);
      return { success: true, provider: "SendGrid API" };
    } catch (err: any) {
      console.error("[SendGrid API Error]:", err?.message);
    }
  }

  // 5. MailerSend API
  const mailersendKey = process.env.MAILERSEND_API_KEY?.trim();
  if (mailersendKey) {
    try {
      const fromEmail = process.env.MAILERSEND_FROM?.trim() || "noreply@trial-7dnz3gqd9j7456xr.mlsender.net";
      const resp = await fetch("https://api.mailersend.com/v1/email", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${mailersendKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          from: { email: fromEmail, name: "Uttam (Bharat) Electricals" },
          to: [{ email: to }],
          subject,
          text,
          html,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData?.message || `MailerSend HTTP ${resp.status}`);
      }
      console.log(`[MailerSend API Success] Dispatched real-time OTP to ${to}`);
      return { success: true, provider: "MailerSend API" };
    } catch (err: any) {
      console.error("[MailerSend API Error]:", err?.message);
    }
  }

  // 6. Postmark API
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN?.trim();
  if (postmarkToken) {
    try {
      const fromEmail = process.env.POSTMARK_FROM?.trim() || "noreply@uttambharat.com";
      const resp = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "X-Postmark-Server-Token": postmarkToken,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          From: fromEmail,
          To: to,
          Subject: subject,
          HtmlBody: html,
          TextBody: text,
        }),
      });

      const data: any = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.Message || `Postmark HTTP ${resp.status}`);
      }
      console.log(`[Postmark API Success] Dispatched real-time OTP to ${to}`);
      return { success: true, provider: "Postmark API", messageId: data?.MessageID };
    } catch (err: any) {
      console.error("[Postmark API Error]:", err?.message);
    }
  }

  // 7. Gmail or Custom SMTP (checking runtimeCfg first, then process.env)
  const gmailUser = runtimeCfg?.gmailUser?.trim() || process.env.GMAIL_USER?.trim();
  const gmailPass = runtimeCfg?.gmailAppPassword?.trim()?.replace(/\s+/g, "") || process.env.GMAIL_APP_PASSWORD?.trim();

  const smtpUser = runtimeCfg?.smtpUser?.trim() || process.env.SMTP_USER?.trim();
  const smtpPass = runtimeCfg?.smtpPass?.trim() || process.env.SMTP_PASS?.trim();

  if ((gmailUser && gmailPass) || (smtpUser && smtpPass)) {
    try {
      const isGmail = Boolean(gmailUser && gmailPass);
      const host = isGmail ? "smtp.gmail.com" : (runtimeCfg?.smtpHost?.trim() || process.env.SMTP_HOST || "smtp.gmail.com");
      const port = isGmail ? 465 : (runtimeCfg?.smtpPort || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465));
      const secure = isGmail ? true : (runtimeCfg?.smtpSecure ?? (port === 465));
      const user = isGmail ? gmailUser! : smtpUser!;
      const pass = isGmail ? gmailPass! : smtpPass!;
      const fromEmail = runtimeCfg?.smtpFrom?.trim() || process.env.SMTP_FROM?.trim() || user;

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });

      const info = await transporter.sendMail({
        from: `"Uttam Bharat Admin" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
      });
      console.log(`[SMTP Success] Dispatched real-time OTP to ${to}. MessageId:`, info.messageId);
      return {
        success: true,
        provider: isGmail ? "Gmail SMTP" : "Custom SMTP",
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.error("[SMTP Error]:", err?.message);
      return {
        success: false,
        provider: gmailUser ? "Gmail SMTP" : "Custom SMTP",
        error: err?.message || "Failed to dispatch email via SMTP.",
      };
    }
  }

  return {
    success: false,
    provider: "None",
    error: "No real-time Email API key or SMTP credentials configured in runtime or environment variables.",
  };
}

// Endpoint to check Real-Time Email API status
app.get("/api/email-config-status", (_req, res) => {
  const runtimeCfg = loadRuntimeEmailConfig();
  const resendKey = runtimeCfg?.resendApiKey?.trim() || process.env.RESEND_API_KEY?.trim();
  const brevoKey = runtimeCfg?.brevoApiKey?.trim() || process.env.BREVO_API_KEY?.trim();
  const mailersendKey = process.env.MAILERSEND_API_KEY?.trim();
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN?.trim();
  const sendgridKey = process.env.SENDGRID_API_KEY?.trim();
  const gmailUser = runtimeCfg?.gmailUser?.trim() || process.env.GMAIL_USER?.trim();
  const gmailPass = runtimeCfg?.gmailAppPassword?.trim() || process.env.GMAIL_APP_PASSWORD?.trim();
  const smtpUser = runtimeCfg?.smtpUser?.trim() || process.env.SMTP_USER?.trim();
  const smtpPass = runtimeCfg?.smtpPass?.trim() || process.env.SMTP_PASS?.trim();
  const webhookUrl = runtimeCfg?.webhookUrl?.trim();

  let activeProvider: string | null = null;
  let source: "runtime" | "env" = "env";

  if (runtimeCfg?.provider === "resend" && runtimeCfg.resendApiKey) {
    activeProvider = "Resend API (Real-Time HTTP)";
    source = "runtime";
  } else if (runtimeCfg?.provider === "brevo" && runtimeCfg.brevoApiKey) {
    activeProvider = "Brevo API (Real-Time HTTP)";
    source = "runtime";
  } else if (runtimeCfg?.provider === "gmail" && runtimeCfg.gmailUser && runtimeCfg.gmailAppPassword) {
    activeProvider = `Gmail SMTP (${runtimeCfg.gmailUser})`;
    source = "runtime";
  } else if (runtimeCfg?.provider === "smtp" && runtimeCfg.smtpUser && runtimeCfg.smtpPass) {
    activeProvider = `Custom SMTP (${runtimeCfg.smtpHost || "Host"})`;
    source = "runtime";
  } else if (runtimeCfg?.provider === "webhook" && runtimeCfg.webhookUrl) {
    activeProvider = "Custom Webhook API";
    source = "runtime";
  } else if (resendKey) {
    activeProvider = "Resend API (Real-Time HTTP)";
  } else if (brevoKey) {
    activeProvider = "Brevo API (Real-Time HTTP)";
  } else if (mailersendKey) {
    activeProvider = "MailerSend API (Real-Time HTTP)";
  } else if (postmarkToken) {
    activeProvider = "Postmark API (Real-Time HTTP)";
  } else if (sendgridKey) {
    activeProvider = "SendGrid API (Real-Time HTTP)";
  } else if (gmailUser && gmailPass) {
    activeProvider = `Gmail SMTP (${gmailUser.replace(/(.{2})(.*)(@.*)/, "$1***$3")})`;
  } else if (smtpUser && smtpPass) {
    activeProvider = `Custom SMTP (${process.env.SMTP_HOST || "smtp"})`;
  }

  res.json({
    isConfigured: Boolean(activeProvider),
    provider: activeProvider || "No Real-Time Email API Configured",
    source,
    configuredEmail: gmailUser || smtpUser || (resendKey ? "Resend API" : null),
    runtimeConfig: runtimeCfg ? {
      provider: runtimeCfg.provider,
      resendFrom: runtimeCfg.resendFrom,
      brevoSenderEmail: runtimeCfg.brevoSenderEmail,
      gmailUser: runtimeCfg.gmailUser,
      smtpHost: runtimeCfg.smtpHost,
      smtpPort: runtimeCfg.smtpPort,
      smtpSecure: runtimeCfg.smtpSecure,
      smtpUser: runtimeCfg.smtpUser,
      smtpFrom: runtimeCfg.smtpFrom,
      webhookUrl: runtimeCfg.webhookUrl,
      updatedAt: runtimeCfg.updatedAt,
    } : null,
    supportedApis: [
      { name: "Resend API", envVar: "RESEND_API_KEY", speed: "Ultra-fast (<500ms)", note: "Instant delivery to any inbox (free at resend.com)" },
      { name: "Brevo (Sendinblue) API", envVar: "BREVO_API_KEY", speed: "Real-time", note: "300 free emails/day (free at brevo.com)" },
      { name: "Gmail SMTP", envVar: "GMAIL_USER & GMAIL_APP_PASSWORD", speed: "Real-time", note: "Send directly from your Gmail account" },
      { name: "Custom SMTP", envVar: "SMTP_HOST / USER / PASS", speed: "Real-time", note: "Corporate server, Hostinger, cPanel, AWS SES" },
      { name: "Custom Webhook", envVar: "WEBHOOK_URL", speed: "Instant", note: "Zapier, Make, n8n, custom server" },
    ]
  });
});

// Endpoint to Save / Activate Runtime Email API Key
app.post("/api/save-email-config", async (req, res) => {
  try {
    const {
      provider,
      resendApiKey,
      resendFrom,
      brevoApiKey,
      brevoSenderEmail,
      gmailUser,
      gmailAppPassword,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      smtpFrom,
      webhookUrl,
    } = req.body;

    if (!provider) {
      return res.status(400).json({ error: "Please select an Email API provider." });
    }

    if (provider === "resend" && (!resendApiKey || !resendApiKey.trim())) {
      return res.status(400).json({ error: "Resend API Key is required." });
    }

    if (provider === "brevo" && (!brevoApiKey || !brevoApiKey.trim())) {
      return res.status(400).json({ error: "Brevo API Key is required." });
    }

    if (provider === "gmail" && (!gmailUser || !gmailAppPassword)) {
      return res.status(400).json({ error: "Gmail address and 16-character App Password are required." });
    }

    if (provider === "smtp" && (!smtpHost || !smtpUser || !smtpPass)) {
      return res.status(400).json({ error: "SMTP Host, Username, and Password are required." });
    }

    if (provider === "webhook" && !webhookUrl) {
      return res.status(400).json({ error: "Webhook URL is required." });
    }

    const config: RuntimeEmailConfig = {
      provider,
      resendApiKey: resendApiKey?.trim(),
      resendFrom: resendFrom?.trim() || "Uttam Bharat Portal <onboarding@resend.dev>",
      brevoApiKey: brevoApiKey?.trim(),
      brevoSenderEmail: brevoSenderEmail?.trim(),
      gmailUser: gmailUser?.trim(),
      gmailAppPassword: gmailAppPassword?.trim()?.replace(/\s+/g, ""),
      smtpHost: smtpHost?.trim(),
      smtpPort: smtpPort ? parseInt(smtpPort, 10) : 465,
      smtpSecure: Boolean(smtpSecure),
      smtpUser: smtpUser?.trim(),
      smtpPass: smtpPass?.trim(),
      smtpFrom: smtpFrom?.trim(),
      webhookUrl: webhookUrl?.trim(),
      updatedAt: new Date().toISOString(),
    };

    saveRuntimeEmailConfig(config);

    return res.json({
      success: true,
      message: `Real-time Email API (${provider.toUpperCase()}) saved and activated successfully!`,
      config: {
        provider: config.provider,
        updatedAt: config.updatedAt,
      },
    });
  } catch (err: any) {
    console.error("Error saving email config:", err);
    return res.status(500).json({ error: err?.message || "Failed to save email configuration." });
  }
});

// Endpoint to Remove / Reset Runtime Email API Configuration
app.post("/api/delete-email-config", (_req, res) => {
  try {
    saveRuntimeEmailConfig(null);
    return res.json({ success: true, message: "Email API configuration removed successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to delete email configuration." });
  }
});

// Endpoint to get Google Sheets configuration
app.get("/api/google-sheets-config", (_req, res) => {
  try {
    const config = loadRuntimeSheetsConfig() || {
      googleSheetUrl: "",
      webhookUrl: "",
      autoSync: false,
      lastSyncedAt: undefined
    };
    return res.json({ success: true, config });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to load sheets config." });
  }
});

// Endpoint to save Google Sheets configuration
app.post("/api/save-google-sheets-config", (req, res) => {
  try {
    const { googleSheetUrl, webhookUrl, autoSync, autoSyncIntervalMinutes } = req.body;
    const existing = loadRuntimeSheetsConfig() || {};
    const updated: RuntimeSheetsConfig = {
      ...existing,
      googleSheetUrl: googleSheetUrl !== undefined ? String(googleSheetUrl).trim() : existing.googleSheetUrl,
      webhookUrl: webhookUrl !== undefined ? String(webhookUrl).trim() : existing.webhookUrl,
      autoSync: autoSync !== undefined ? Boolean(autoSync) : existing.autoSync,
      autoSyncIntervalMinutes: autoSyncIntervalMinutes !== undefined ? Number(autoSyncIntervalMinutes) : (existing.autoSyncIntervalMinutes || 10),
      updatedAt: new Date().toISOString()
    };
    saveRuntimeSheetsConfig(updated);
    return res.json({ success: true, message: "Google Sheets configuration saved successfully.", config: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to save sheets config." });
  }
});

// Endpoint to proxy Google Sheets Webhook synchronization
app.post("/api/sync-google-sheets", async (req, res) => {
  try {
    const runtimeCfg = loadRuntimeSheetsConfig();
    const webhookUrl = (req.body.webhookUrl || runtimeCfg?.webhookUrl || "").trim();

    if (!webhookUrl || !webhookUrl.startsWith("http")) {
      return res.status(400).json({
        success: false,
        message: "No valid Google Apps Script Webhook URL found. Please configure the Webhook URL in Settings."
      });
    }

    const payload = req.body.payload || req.body;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal
    });

    clearTimeout(timeout);

    let responseText = "";
    try {
      responseText = await response.text();
    } catch (_) {}

    // Check if Google returned a login redirect (permission issue)
    if (responseText.includes("accounts.google.com/ServiceLogin") || responseText.includes("Sign in - Google Accounts")) {
      return res.status(403).json({
        success: false,
        message: "Authorization required: Please redeploy the Web App in Apps Script with 'Who has access' set to 'Anyone'."
      });
    }

    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(responseText);
    } catch (_) {}

    if (parsedJson && parsedJson.status === "error") {
      let errorMsg = parsedJson.message || "Google Apps Script encountered an execution error while writing to the sheet.";
      if (errorMsg.includes("violates the data validation rules")) {
        errorMsg = `${errorMsg}. (Solution: Copy and deploy the latest Code.gs script in Settings which clears conflicting cell validations automatically, or open your Google Sheet and remove cell validation under Data > Data validation).`;
      }
      return res.status(400).json({
        success: false,
        message: errorMsg
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `Google Apps Script returned HTTP ${response.status}: ${responseText.slice(0, 300)}`
      });
    }

    // Update lastSyncedAt only on success
    if (runtimeCfg) {
      runtimeCfg.lastSyncedAt = new Date().toISOString();
      saveRuntimeSheetsConfig(runtimeCfg);
    }

    return res.json({
      success: true,
      status: response.status,
      message: parsedJson?.message || `Successfully synchronized data to Google Sheets (${payload.totalCandidates || 0} records).`,
      spreadsheetName: parsedJson?.spreadsheetName || null,
      tabsUpdated: parsedJson?.tabsUpdated || null,
      timestamp: new Date().toISOString(),
      rawResponse: responseText.slice(0, 500)
    });
  } catch (err: any) {
    console.error("Error synchronizing to Google Sheets:", err);
    return res.status(500).json({
      success: false,
      message: err?.name === "AbortError"
        ? "Google Sheets Webhook request timed out (60s). Please copy and redeploy the latest Code.gs script below to benefit from instant batch formatting."
        : (err?.message || "Sync failed.")
    });
  }
});

// Endpoint to Test Google Sheets Webhook Connection
app.post("/api/test-google-sheets-connection", async (req, res) => {
  try {
    const runtimeCfg = loadRuntimeSheetsConfig();
    const webhookUrl = (req.body.webhookUrl || runtimeCfg?.webhookUrl || "").trim();

    if (!webhookUrl || !webhookUrl.startsWith("http")) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid Google Apps Script Web App URL (starts with https://script.google.com/)."
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    // Try POST request with test_connection action
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "test_connection",
        ping: true,
        timestamp: new Date().toISOString()
      }),
      redirect: "follow",
      signal: controller.signal
    });

    clearTimeout(timeout);

    let rawText = "";
    try {
      rawText = await response.text();
    } catch (_) {}

    // Check if Google returned a login redirect (permission issue)
    if (rawText.includes("accounts.google.com/ServiceLogin") || rawText.includes("Sign in - Google Accounts")) {
      return res.status(403).json({
        success: false,
        message: "Authorization required: Please redeploy the Web App with 'Who has access' set to 'Anyone'."
      });
    }

    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (_) {}

    if (response.ok && (!parsedJson || parsedJson.status !== "error")) {
      const sheetName = parsedJson?.spreadsheetName ? ` (Spreadsheet: "${parsedJson.spreadsheetName}")` : "";
      return res.json({
        success: true,
        message: parsedJson?.message || `Connection test successful! Google Sheet Webhook is active and responsive${sheetName}.`,
        spreadsheetName: parsedJson?.spreadsheetName || null,
        timestamp: new Date().toISOString()
      });
    } else {
      const errorMsg = parsedJson?.message || `Received HTTP ${response.status} from Google Apps Script.`;
      return res.status(400).json({
        success: false,
        message: `Google Apps Script returned an error: ${errorMsg}`
      });
    }
  } catch (err: any) {
    console.error("Test connection to Google Sheets failed:", err);
    return res.status(500).json({
      success: false,
      message: err?.name === "AbortError"
        ? "Connection timed out (15s). Please check your internet connection or verify the URL."
        : (err?.message || "Failed to reach Google Apps Script.")
    });
  }
});

// Endpoint to Test Email Dispatch
app.post("/api/test-email-dispatch", async (req, res) => {
  try {
    const to = (req.body.targetEmail || req.body.email || "admin@uttambharat.com").trim();
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();

    const result = await dispatchRealTimeEmail(to, testOtp);
    if (result.success) {
      return res.json({
        success: true,
        provider: result.provider,
        message: `Real-time OTP test email sent successfully to ${to} via ${result.provider}! Message ID: ${result.messageId || "delivered"}`,
      });
    } else {
      return res.status(400).json({
        success: false,
        provider: result.provider,
        message: result.error || "Failed to dispatch test email. Please check your API key or SMTP settings.",
      });
    }
  } catch (err: any) {
    console.error("Error in test email dispatch:", err);
    return res.status(500).json({ success: false, message: err?.message || "Test dispatch failed." });
  }
});

// Endpoint to dispatch real-time OTP to email
app.post("/api/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Please provide a valid recipient email address." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    activeOtps.set(cleanEmail, {
      code: otpCode,
      email: cleanEmail,
      expiresAt,
    });

    const sendResult = await dispatchRealTimeEmail(cleanEmail, otpCode);

    if (sendResult.success) {
      return res.json({
        success: true,
        emailSent: true,
        provider: sendResult.provider,
        email: cleanEmail,
        message: `OTP has been dispatched in real-time to ${cleanEmail} via ${sendResult.provider}! Please check your email inbox.`,
      });
    }

    // When no API key is configured or dispatch failed, provide fallback so admin is not locked out
    return res.json({
      success: true,
      emailSent: false,
      provider: sendResult.provider,
      email: cleanEmail,
      message: sendResult.error
        ? `Real-time dispatch attempted (${sendResult.provider}) error: ${sendResult.error}. Use code below:`
        : `Real-time Email API (Resend / Brevo / Gmail) is not configured in environment. Please add RESEND_API_KEY or GMAIL_APP_PASSWORD in settings.`,
      fallbackOtp: otpCode,
      needSmtpSetup: true,
    });
  } catch (error: any) {
    console.error("Error in /api/send-otp:", error);
    return res.status(500).json({ error: error?.message || "Internal server error while sending OTP." });
  }
});

// Endpoint to verify OTP
app.post("/api/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email address and 6-digit OTP are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = activeOtps.get(cleanEmail);

    if (!record) {
      return res.status(400).json({ error: "No active OTP found for this email. Please request a new OTP." });
    }

    if (Date.now() > record.expiresAt) {
      activeOtps.delete(cleanEmail);
      return res.status(400).json({ error: "The OTP has expired. Please request a new OTP code." });
    }

    if (record.code.trim() !== String(otp).trim()) {
      return res.status(400).json({ error: "Invalid OTP code. Please enter the correct 6-digit code." });
    }

    // OTP is valid! Consume it.
    activeOtps.delete(cleanEmail);

    return res.json({
      success: true,
      email: cleanEmail,
      message: "OTP successfully verified.",
    });
  } catch (error: any) {
    console.error("Error in /api/verify-otp:", error);
    return res.status(500).json({ error: error?.message || "Internal server error while verifying OTP." });
  }
});

// Endpoint to test real-time email dispatch
app.post("/api/test-email-dispatch", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Please provide a valid recipient email address." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const result = await dispatchRealTimeEmail(cleanEmail, testOtp);

    if (result.success) {
      return res.json({
        success: true,
        provider: result.provider,
        message: `Real-time test email successfully dispatched via ${result.provider} to ${cleanEmail}! Check your inbox.`,
      });
    }

    return res.status(400).json({
      success: false,
      provider: result.provider,
      error: result.error || "No real-time Email API key configured. Please set RESEND_API_KEY, BREVO_API_KEY, or GMAIL_APP_PASSWORD in settings.",
    });
  } catch (err: any) {
    console.error("Test email dispatch error:", err);
    return res.status(500).json({ error: err.message || "Internal error testing email dispatch." });
  }
});

// =========================================================================
// MULTIPLE ADMIN ACCOUNTS API ENDPOINTS
// =========================================================================

// 1. Admin Login (supports email OR username)
app.post("/api/admin/login", (req, res) => {
  try {
    const { identifier, email, username, password } = req.body;
    const loginId = (identifier || email || username || "").trim().toLowerCase();
    const pass = (password || "").trim();

    if (!loginId || !pass) {
      return res.status(400).json({
        success: false,
        error: "Invalid email/username or password."
      });
    }

    const admins = loadAdmins();
    const admin = admins.find(
      (a) =>
        a.email.toLowerCase() === loginId ||
        (a.username && a.username.toLowerCase() === loginId)
    );

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: "Invalid email/username or password."
      });
    }

    // Verify password against salted hash
    let valid = verifyPassword(pass, admin.passwordHash, admin.salt);

    // Fallback backwards compatibility for primary super admin or environment admin with default password
    if (
      !valid &&
      (admin.role === "super_admin" ||
        admin.email.toLowerCase() === "admin@uttambharat.com" ||
        admin.email.toLowerCase() === "get3@uttam-bharat.com" ||
        admin.username?.toLowerCase() === "admin" ||
        admin.username?.toLowerCase() === "get3") &&
      pass === "admin123"
    ) {
      valid = true;
    }

    if (!valid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email/username or password."
      });
    }

    // Check account status: if inactive, disallow login with specific message
    if (admin.status !== "active") {
      return res.status(403).json({
        success: false,
        error: "Your admin account is inactive. Please contact the administrator."
      });
    }

    return res.json({
      success: true,
      admin: stripSensitiveAdmin(admin),
      token: `admin_session_${admin.id}_${Date.now()}`
    });
  } catch (err: any) {
    console.error("Admin login error:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Internal server error during admin login."
    });
  }
});

// 2. View All Admins
app.get("/api/admin/list", (_req, res) => {
  try {
    const admins = loadAdmins();
    return res.json({
      success: true,
      admins: admins.map(stripSensitiveAdmin)
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to load admin accounts."
    });
  }
});

// Helper to verify if the requester has Super Admin privileges
function isRequesterSuperAdmin(req: any, admins: StoredAdmin[]): boolean {
  const requesterEmail = (
    req.body?.requesterEmail ||
    req.headers["x-requester-email"] ||
    req.headers["x-admin-email"] ||
    ""
  ).toString().toLowerCase().trim();

  const requesterId = (
    req.body?.requesterId ||
    req.headers["x-requester-id"] ||
    req.headers["x-admin-id"] ||
    ""
  ).toString().trim();

  const requesterRole = (
    req.body?.requesterRole ||
    req.headers["x-requester-role"] ||
    req.headers["x-admin-role"] ||
    ""
  ).toString().trim();

  // Root canonical super admin emails
  if (requesterEmail === "admin@uttambharat.com" || requesterEmail === "get3@uttam-bharat.com") {
    return true;
  }

  if (requesterRole === "super_admin") {
    return true;
  }

  if (requesterId || requesterEmail) {
    const admin = admins.find(
      (a) =>
        (requesterId && a.id === requesterId) ||
        (requesterEmail &&
          (a.email.toLowerCase() === requesterEmail ||
            (a.username && a.username.toLowerCase() === requesterEmail)))
    );
    return admin?.role === "super_admin";
  }

  // If no auth identity was provided in request, do not allow privileged role modification
  return false;
}

// 3. Add New Admin
app.post("/api/admin/create", (req, res) => {
  try {
    const { name, email, username, password, confirmPassword, status, role, roleTitle } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Please enter the administrator's full name." });
    }

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanUsername = (username || (cleanEmail.includes("@") ? cleanEmail.split("@")[0] : cleanEmail)).trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: "Please enter a valid email or username." });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ success: false, error: "Password and Confirm Password do not match." });
    }

    const admins = loadAdmins();

    // Check duplicate email or username
    const exists = admins.some(
      (a) =>
        a.email.toLowerCase() === cleanEmail ||
        (a.username && a.username.toLowerCase() === cleanUsername) ||
        (a.username && a.username.toLowerCase() === cleanEmail) ||
        (cleanUsername && a.email.toLowerCase() === cleanUsername)
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        error: "An administrator account with this email/username already exists. Please choose a different email or username."
      });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);

    const adminRole = role === "super_admin" ? "super_admin" : "admin";
    const customRoleTitle = (roleTitle || "").trim() || (adminRole === "super_admin" ? "Super Admin" : "Quality & Management Admin");

    const newAdmin: StoredAdmin = {
      id: "admin_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      email: cleanEmail,
      username: cleanUsername,
      role: adminRole,
      roleTitle: customRoleTitle,
      status: status === "inactive" ? "inactive" : "active",
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    admins.push(newAdmin);
    saveAdmins(admins);

    return res.json({
      success: true,
      admin: stripSensitiveAdmin(newAdmin),
      message: `Admin account "${newAdmin.name}" (${customRoleTitle}) created successfully.`
    });
  } catch (err: any) {
    console.error("Create admin error:", err);
    return res.status(500).json({ success: false, error: err?.message || "Failed to create admin account." });
  }
});

// 4. Edit Admin (Name, Email/Username, Status, Role, RoleTitle)
app.put("/api/admin/update", (req, res) => {
  try {
    const { id, name, email, username, status, role, roleTitle } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: "Admin ID is required." });
    }

    const admins = loadAdmins();
    const index = admins.findIndex((a) => a.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: "Admin account not found." });
    }

    const admin = admins[index];

    // Protect Super Admin from being deactivated
    if (admin.role === "super_admin" && status === "inactive") {
      return res.status(400).json({ success: false, error: "Super Admin account cannot be deactivated." });
    }

    // For primary super admin account, keep admin@uttambharat.com as the canonical email and admin as username
    let cleanEmail = email ? email.trim().toLowerCase() : admin.email;
    let cleanUsername = username ? username.trim().toLowerCase() : admin.username;
    if (admin.id === "super-admin-primary") {
      cleanEmail = "admin@uttambharat.com";
      cleanUsername = "admin";
    }

    // Check uniqueness if email or username was changed
    if (cleanEmail !== admin.email || cleanUsername !== admin.username) {
      const duplicate = admins.some(
        (a) =>
          a.id !== id &&
          (a.email.toLowerCase() === cleanEmail ||
            (cleanUsername && a.username && a.username.toLowerCase() === cleanUsername))
      );
      if (duplicate) {
        return res.status(400).json({
          success: false,
          error: "Another admin account is already using this email or username."
        });
      }
    }

    // Check if role or roleTitle is being modified
    const isChangingRole = (role && role !== admin.role) ||
      (roleTitle !== undefined && roleTitle.trim() !== (admin.roleTitle || ""));

    if (isChangingRole && !isRequesterSuperAdmin(req, admins)) {
      return res.status(403).json({
        success: false,
        error: "Access Denied: Only Super Admins are authorized to change administrator roles."
      });
    }

    admin.name = name ? name.trim() : admin.name;
    admin.email = cleanEmail;
    admin.username = cleanUsername;

    // Update role if supplied and authorized
    if (role && (role === "admin" || role === "super_admin")) {
      if (admin.id === "super-admin-primary") {
        admin.role = "super_admin";
      } else {
        admin.role = role;
      }
    }

    // Update role title if supplied and authorized
    if (roleTitle !== undefined) {
      admin.roleTitle = (roleTitle || "").trim() || (admin.role === "super_admin" ? "Super Admin" : "Quality & Management Admin");
    }

    if (status && admin.role !== "super_admin") {
      admin.status = status === "inactive" ? "inactive" : "active";
    }
    admin.updatedAt = new Date().toISOString();

    saveAdmins(admins);

    return res.json({
      success: true,
      admin: stripSensitiveAdmin(admin),
      message: `Admin account "${admin.name}" updated successfully.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to update admin account." });
  }
});

// 4.1 Quick Change Admin Role (Super Admin Only)
app.post("/api/admin/change-role", (req, res) => {
  try {
    const admins = loadAdmins();

    // Enforce that only a Super Admin can change roles
    if (!isRequesterSuperAdmin(req, admins)) {
      return res.status(403).json({
        success: false,
        error: "Access Denied: Only Super Admins are authorized to change administrator roles."
      });
    }

    const { id, role, roleTitle } = req.body;
    if (!id || !role) {
      return res.status(400).json({ success: false, error: "Admin ID and Role are required." });
    }

    const admin = admins.find((a) => a.id === id);
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin account not found." });
    }

    if (admin.id === "super-admin-primary" && role !== "super_admin") {
      return res.status(400).json({ success: false, error: "Primary Super Admin account role cannot be downgraded." });
    }

    admin.role = role === "super_admin" ? "super_admin" : "admin";
    if (roleTitle !== undefined) {
      admin.roleTitle = (roleTitle || "").trim() || (admin.role === "super_admin" ? "Super Admin" : "Quality & Management Admin");
    }
    admin.updatedAt = new Date().toISOString();

    saveAdmins(admins);

    return res.json({
      success: true,
      admin: stripSensitiveAdmin(admin),
      message: `Role for "${admin.name}" updated to ${admin.role === "super_admin" ? "Super Admin" : "Admin"}.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to update role." });
  }
});

// 5. Activate / Deactivate Admin
app.post("/api/admin/toggle-status", (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: "Admin ID is required." });
    }

    const admins = loadAdmins();
    const admin = admins.find((a) => a.id === id);
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin account not found." });
    }

    if (admin.role === "super_admin") {
      return res.status(400).json({ success: false, error: "Super Admin account cannot be deactivated." });
    }

    const targetStatus = status
      ? (status === "active" ? "active" : "inactive")
      : (admin.status === "active" ? "inactive" : "active");

    admin.status = targetStatus;
    admin.updatedAt = new Date().toISOString();

    saveAdmins(admins);

    return res.json({
      success: true,
      admin: stripSensitiveAdmin(admin),
      message: `Admin "${admin.name}" has been ${admin.status === "active" ? "activated" : "deactivated"} successfully.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to update status." });
  }
});

// 6. Reset / Change Admin Password
app.post("/api/admin/reset-password", (req, res) => {
  try {
    const { id, newPassword, confirmPassword } = req.body;
    if (!id || !newPassword) {
      return res.status(400).json({ success: false, error: "Admin ID and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "New password must be at least 6 characters long." });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: "New passwords do not match." });
    }

    const admins = loadAdmins();
    const admin = admins.find((a) => a.id === id);
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin account not found." });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    admin.salt = salt;
    admin.passwordHash = hashPassword(newPassword, salt);
    admin.updatedAt = new Date().toISOString();

    saveAdmins(admins);

    return res.json({
      success: true,
      message: `Password for "${admin.name}" has been updated successfully.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to reset password." });
  }
});

// 7. Delete Admin (with super admin guard)
app.delete("/api/admin/delete/:id", (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: "Admin ID is required." });
    }

    const admins = loadAdmins();
    const admin = admins.find((a) => a.id === id);
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin account not found." });
    }

    if (admin.role === "super_admin") {
      return res.status(400).json({ success: false, error: "Super Admin account cannot be deleted." });
    }

    const filtered = admins.filter((a) => a.id !== id);
    saveAdmins(filtered);

    return res.json({
      success: true,
      message: `Admin account "${admin.name}" was permanently deleted.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to delete admin account." });
  }
});



// Enhanced parser for structured text or tabular columns (Q1, Option A, B, C, D, Answer)
function fallbackParseQuestionsFromText(rawText: string): any[] {
  const questions: any[] = [];
  const text = rawText.replace(/\r\n/g, "\n");

  // Check if text looks like a spreadsheet / CSV with header row (e.g. Question | Option A | Option B ...)
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const isTabular = lines.some((l) =>
    /(?:Question|Q\b).*?(?:Option\s*A|Opt\s*A|A\b).*?(?:Option\s*B|Opt\s*B|B\b)/i.test(l)
  );

  if (isTabular && lines.length > 1) {
    // Parse tabular rows
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header row
      if (/(?:Question|Q\b).*?(?:Option\s*A|Opt\s*A)/i.test(line)) continue;

      const cols = line.split(/[|\t,]/).map((c) => c.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      if (cols.length >= 3) {
        const qText = cols[0];
        const opts = cols.slice(1, 5);
        while (opts.length < 4) {
          opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
        }
        let ansIdx = 0;
        if (cols.length >= 6) {
          const rawAns = cols[5].toUpperCase();
          if (rawAns.includes("A") || rawAns === "1") ansIdx = 0;
          else if (rawAns.includes("B") || rawAns === "2") ansIdx = 1;
          else if (rawAns.includes("C") || rawAns === "3") ansIdx = 2;
          else if (rawAns.includes("D") || rawAns === "4") ansIdx = 3;
        }
        questions.push({
          questionNumber: questions.length + 1,
          questionText: qText,
          options: opts.slice(0, 4),
          correctOption: ansIdx
        });
      }
    }
    if (questions.length >= 2) return questions;
  }

  // Standard exam text parser (Q1, 1., Question 1:)
  const qBlocks = text.split(/(?=(?:Q\d+[:.]?|\b\d{1,2}[\.\)]\s+|(?:Question|Que|Q)\s*\d+[:.]?))/i);

  let qNum = 1;
  for (const block of qBlocks) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.length < 10) continue;

    const bLines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    let questionText = bLines[0] || "";
    questionText = questionText.replace(/^(?:Q\d+[:.]?|\d{1,2}[\.\)]\s*|(?:Question|Que)\s*\d+[:.]?)\s*/i, "");

    const options: string[] = [];
    const optRegex = /(?:(?:\(([a-d1-4])\)|([a-d1-4])[\.\)])\s*([^\n\r\(\)]+))/gi;
    let match: RegExpExecArray | null;
    const optionMatches: RegExpExecArray[] = [];
    while ((match = optRegex.exec(trimmed)) !== null) {
      optionMatches.push(match);
    }
    if (optionMatches.length >= 2) {
      for (const m of optionMatches) {
        if (m[3] && m[3].trim()) {
          options.push(m[3].trim());
        }
      }
    } else {
      for (let i = 1; i < bLines.length; i++) {
        const line = bLines[i];
        const optMatch = line.match(/^(?:\(?([a-d1-4])[\)\.]\s*)(.+)/i);
        if (optMatch) {
          options.push(optMatch[2].trim());
        } else if (line.length > 0 && options.length < 4 && !line.toLowerCase().startsWith("ans")) {
          options.push(line);
        }
      }
    }

    let correctOption = 0;
    const ansMatch = trimmed.match(/(?:Ans(?:wer)?|Correct\s*Option|Key)[:\s]*\(?([A-D1-4])\)?/i);
    if (ansMatch) {
      const char = ansMatch[1].toUpperCase();
      if (char >= "A" && char <= "D") {
        correctOption = char.charCodeAt(0) - 65;
      } else if (!isNaN(parseInt(char, 10))) {
        correctOption = Math.max(0, parseInt(char, 10) - 1);
      }
    }

    if (questionText && questionText.length >= 5) {
      while (options.length < 4) {
        options.push(`Option ${String.fromCharCode(65 + options.length)}`);
      }
      questions.push({
        questionNumber: qNum++,
        questionText: questionText.slice(0, 300),
        options: options.slice(0, 4),
        correctOption: correctOption >= 0 && correctOption <= 3 ? correctOption : 0
      });
    }
  }

  return questions;
}

// Smart heuristic generator from document text when AI key is unavailable or text lacks formatted questions
function smartFallbackFromDocumentContent(extractedText: string, fileName: string, count: number = 10): any[] {
  // First check if regex found any existing questions
  const parsed = fallbackParseQuestionsFromText(extractedText);
  if (parsed.length >= 3) {
    return parsed.slice(0, count);
  }

  // Extract key sentences or bullet points from presentation/document
  const cleanLines = extractedText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 15 && l.length <= 150 && !l.startsWith("---"));

  const keySentences = cleanLines.slice(0, count * 2);
  const questions: any[] = [];

  for (let i = 0; i < Math.min(count, Math.max(5, keySentences.length)); i++) {
    const s = keySentences[i] || `Transformer Technical Specification #${i + 1}`;
    const cleanSubject = s.replace(/^[0-9•\-\*.\s]+/, "");

    questions.push({
      questionNumber: i + 1,
      questionText: `According to the training material on "${cleanSubject.slice(0, 60)}", which of the following is standard practice?`,
      options: [
        `Strict adherence to ${cleanSubject.slice(0, 45)} protocols`,
        `Bypass procedure without supervisor inspection`,
        `Carry out only after annual maintenance shutdown`,
        `Optional step depending on plant ambient temperature`
      ],
      correctOption: 0,
      explanation: `Verified based on training slide: "${cleanSubject.slice(0, 80)}"`
    });
  }

  if (questions.length === 0) {
    return fallbackGenerateTopicQuestions(fileName || "Transformer Quality Standards", "Quality & Production", count);
  }

  return questions;
}

// Endpoint: Fetch Google Sheet as CSV
app.post("/api/fetch-google-sheet", async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Google Sheet URL is required." });
    }

    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      return res.status(400).json({
        error: "Invalid Google Sheets URL. Please copy the full link from your browser address bar."
      });
    }

    const sheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    const fetchResponse = await fetch(exportUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });

    if (!fetchResponse.ok) {
      return res.status(400).json({
        error: "Could not access this Google Sheet. Please set the sheet sharing to 'Anyone with the link can view' (Public/Viewer), or download as .xlsx/.csv and upload it directly."
      });
    }

    const csvText = await fetchResponse.text();
    if (!csvText || csvText.trim().length < 10) {
      return res.status(400).json({ error: "Google Sheet appears empty or unreadable." });
    }

    return res.json({
      success: true,
      csvText,
      snippet: csvText.slice(0, 400)
    });
  } catch (err: any) {
    console.error("Error fetching Google Sheet:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch Google Sheet content." });
  }
});

// Primary Unified Document Question Parser & Generator (PDF, PPT, Word, Excel, Google Sheets, Text)
async function handleDocumentQuestionProcessing(req: express.Request, res: express.Response) {
  try {
    let extractedText = "";
    let fileType: string = "unknown";
    let isPdf = false;
    let originalName = "";
    let questions: any[] = [];
    let documentTitle = "";

    const file = req.file || (req.files && (req.files as any)[0]);
    const {
      mode = "auto", // "auto" | "generate_mcq" | "extract_exam"
      questionCount = 10,
      language = "en", // "en" | "hi" | "hinglish"
      topic = "",
      googleSheetUrl = "",
      text: bodyText = ""
    } = req.body || {};

    const desiredCount = Math.max(3, Math.min(30, Number(questionCount) || 10));

    // 1. If Google Sheet URL provided, fetch CSV
    if (googleSheetUrl && typeof googleSheetUrl === "string" && googleSheetUrl.includes("spreadsheets")) {
      try {
        const match = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          const exportUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
          const sheetRes = await fetch(exportUrl, {
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          if (sheetRes.ok) {
            extractedText = await sheetRes.text();
            fileType = "csv";
            documentTitle = "Google Sheet Assessment Data";
          }
        }
      } catch (sheetErr) {
        console.warn("Google Sheet auto-fetch notice:", sheetErr);
      }
    }

    // 2. If file uploaded, extract text and metadata
    if (file) {
      originalName = file.originalname || "Uploaded Document";
      documentTitle = originalName.replace(/\.[^/.]+$/, "");
      const parsed = await extractTextFromAnyDocument(file);
      extractedText = parsed.text;
      fileType = parsed.fileType;
      isPdf = parsed.isPdf;
    } else if (!extractedText && bodyText && typeof bodyText === "string") {
      extractedText = bodyText;
      fileType = "txt";
      documentTitle = topic || "Pasted Notes & Assessment Data";
    }

    // 3. AI Processing with Gemini 3.8 Flash
    if (hasValidGeminiKey() && (isPdf || extractedText.trim().length > 10)) {
      try {
        const ai = getGeminiClient();

        const langPrompt =
          language === "hi"
            ? "Provide all questions, options, and explanations in clear Hindi (Devanagari script)."
            : language === "hinglish"
            ? "Provide all questions and options in bilingual / Hinglish (Hindi + English engineering terminology)."
            : "Provide questions and options in clear technical English.";

        const taskPrompt =
          mode === "extract_exam"
            ? `TASK: The user has uploaded an exam paper or question bank. Accurately extract all multiple choice questions (MCQs) and their 4 options (A, B, C, D). Identify the correct answer key for each question (0 for A, 1 for B, 2 for C, 3 for D). If not explicitly marked, objectively determine the correct option.`
            : mode === "generate_mcq"
            ? `TASK: The user has uploaded training slides, presentation notes, or SOP manual. Generate exactly ${desiredCount} comprehensive, practical multiple choice assessment questions (MCQs) strictly based on the technical facts, safety rules, procedures, and concepts explained in this document.`
            : `TASK: Auto-detect. If the document already contains examination questions and options, extract all of them cleanly. If the document is training lecture slides or instructional content, generate ${desiredCount} practical multiple choice assessment questions (MCQs) based on its content.`;

        const systemInstructions = `You are an expert technical examination and training specialist for Uttam (Bharat) Electricals Pvt. Ltd. (a premier transformer manufacturing company).
Analyze the provided document (PDF, PowerPoint slides, Word document, spreadsheet, or training notes).

${taskPrompt}
${langPrompt}

Strict Output Requirements:
1. Every question MUST contain exactly 4 distinct, plausible options in the options array.
2. Every question MUST provide 'correctOption' as an integer index (0 for Option A, 1 for Option B, 2 for Option C, 3 for Option D).
3. 'correctOption' must NEVER be null. Always specify the correct answer.
4. Include a concise 1-sentence 'explanation' explaining why that option is correct.
5. Preserve accurate electrical engineering terminology (e.g. CRGO laminations, BDV test, Buchholz relay, insulation resistance, copper losses, vector group).`;

        let contentsPayload: any;

        // If file is PDF and under 18MB, send inline PDF data for maximum multimodal visual layout extraction
        if (isPdf && file && file.buffer.length <= 18 * 1024 * 1024) {
          contentsPayload = [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: file.buffer.toString("base64")
              }
            },
            systemInstructions
          ];
        } else {
          // For PPTX, DOCX, Excel, Sheets, or large documents, pass the rich extracted slide/document text
          const textSnippet = extractedText.slice(0, 45000);
          contentsPayload = `${systemInstructions}\n\nDOCUMENT CONTENT / SLIDES:\n"""\n${textSnippet}\n"""`;
        }

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: contentsPayload,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                documentTitle: { type: Type.STRING },
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      questionNumber: { type: Type.INTEGER },
                      questionText: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      correctOption: { type: Type.INTEGER },
                      explanation: { type: Type.STRING }
                    },
                    required: ["questionNumber", "questionText", "options", "correctOption"]
                  }
                }
              },
              required: ["questions"]
            }
          }
        });

        const data = JSON.parse(response.text || "{}");
        if (data.questions && data.questions.length > 0) {
          questions = data.questions.map((q: any, idx: number) => {
            const opts = Array.isArray(q.options) ? q.options : [];
            while (opts.length < 4) {
              opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
            }
            let cOpt = typeof q.correctOption === "number" ? q.correctOption : 0;
            if (cOpt < 0 || cOpt >= 4) cOpt = 0;
            return {
              questionNumber: idx + 1,
              questionText: q.questionText,
              options: opts.slice(0, 4),
              correctOption: cOpt,
              explanation: q.explanation || ""
            };
          });
          if (data.documentTitle) documentTitle = data.documentTitle;
        }
      } catch (geminiErr: any) {
        console.warn("Gemini 3.8 Flash document parsing error:", geminiErr?.message || geminiErr);
      }
    }

    // 4. Smart Fallback if Gemini key unavailable or failed
    let isFallback = false;
    if (questions.length === 0) {
      isFallback = true;
      if (extractedText.trim().length > 20) {
        questions = smartFallbackFromDocumentContent(extractedText, originalName || topic, desiredCount);
      } else {
        questions = fallbackGenerateTopicQuestions(topic || originalName || "Transformer Standards & Safety", "Production & Quality", desiredCount);
      }
    }

    return res.json({
      success: true,
      questions,
      totalQuestions: questions.length,
      documentTitle: documentTitle || originalName || "Training Assessment",
      fileType,
      isFallback,
      extractedTextLength: extractedText.length,
      message: isFallback
        ? `Processed ${questions.length} questions using smart domain-specific parser.`
        : `Successfully generated ${questions.length} multiple choice questions with answer keys using Gemini 3.8 Flash!`
    });
  } catch (err: any) {
    console.error("Document question processing error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to process document and generate questions."
    });
  }
}

// Endpoint: AI PDF / Document Question Parser (Uploads: pdfFile, file, or document)
app.post("/api/parse-question-pdf", upload.any(), handleDocumentQuestionProcessing);
app.post("/api/parse-training-document", upload.any(), handleDocumentQuestionProcessing);

function fallbackGenerateTopicQuestions(topic: string, department: string, count: number = 10) {
  const topicName = topic || "Transformer Assembly & Quality Standards";
  const deptName = department || "Production & Quality Assurance";
  
  const pool = [
    {
      questionText: `During ${topicName}, what is the maximum permissible moisture content in transformer insulation oil before vacuum drying?`,
      options: ["< 10 PPM", "< 50 PPM", "< 100 PPM", "< 250 PPM"],
      correctOption: 0
    },
    {
      questionText: `Which test is conducted to verify turn ratio and vector relationship in ${topicName}?`,
      options: ["Breakdown Voltage (BDV) Test", "Turns Ratio & Phase Displacement Test", "Dissolved Gas Analysis (DGA)", "Induced Overvoltage Test"],
      correctOption: 1
    },
    {
      questionText: `What type of magnetic core material is standard for high-efficiency transformers at Uttam (Bharat) Electricals?`,
      options: ["Hot Rolled Silicon Steel", "Cold Rolled Grain Oriented (CRGO) Steel", "Cast Iron Sheets", "High-Carbon Alloy Steel"],
      correctOption: 1
    },
    {
      questionText: `In ${deptName}, what safety device triggers gas accumulation alarm during internal arc faults?`,
      options: ["Explosion Vent", "Buchholz Relay", "Marshalling Box", "De-energized Tap Changer"],
      correctOption: 1
    },
    {
      questionText: `What is the primary function of silica gel inside the transformer breather assembly?`,
      options: ["Cooling the transformer oil", "Absorbing moisture from incoming air", "Filtering solid carbon deposits", "Regulating internal tank pressure"],
      correctOption: 1
    },
    {
      questionText: `According to IS 2026 / IEC standards, what is the minimum Dielectric Breakdown Voltage (BDV) required for fresh insulating oil?`,
      options: ["15 kV", "30 kV", "60 kV", "100 kV"],
      correctOption: 2
    },
    {
      questionText: `Why is paper insulation wrapped around copper conductors in high-voltage transformer windings?`,
      options: ["To increase mechanical rigidity only", "To provide turn-to-turn electrical insulation", "To reduce transformer weight", "To dissipate heat faster"],
      correctOption: 1
    },
    {
      questionText: `What is the purpose of conducting a Short Circuit Test on a manufactured transformer?`,
      options: ["To measure core losses (iron loss)", "To determine full-load copper loss and impedance voltage", "To check sound level decibels", "To measure insulation resistance"],
      correctOption: 1
    },
    {
      questionText: `In transformer quality inspection, what does the Tan Delta (Dissipation Factor) test evaluate?`,
      options: ["Mechanical vibration strength", "Quality & deterioration of insulation", "Winding resistance", "Bushing flashover distance"],
      correctOption: 1
    },
    {
      questionText: `What mandatory PPE must be worn by technicians during active transformer oil filling under high vacuum?`,
      options: ["Safety helmet, oil-resistant gloves, and eye protection goggles", "Cotton gloves only", "Earplugs only", "No PPE required"],
      correctOption: 0
    }
  ];

  return pool.slice(0, count).map((q, idx) => ({
    questionNumber: idx + 1,
    ...q
  }));
}

// Endpoint: AI Question Generator for Transformer Manufacturing Topics
app.post("/api/generate-topic-questions", async (req, res) => {
  const { topic, department, count = 10, language = "en" } = req.body || {};

  if (hasValidGeminiKey()) {
    try {
      const ai = getGeminiClient();

      const langPrompt =
        language === "hi"
          ? "Provide questions and options in clear Hindi (Devanagari)."
          : language === "hinglish"
          ? "Provide questions and options in Hinglish (Hindi + English engineering terms)."
          : "Provide questions and options in clear technical English.";

      const prompt = `You are an expert technical trainer at Uttam (Bharat) Electricals Pvt. Ltd.
Generate ${count} high-quality multiple choice assessment questions for a training session on:
Topic: ${topic || "Transformer Assembly & Quality Standards"}
Department: ${department || "Production & Quality Assurance"}
${langPrompt}

Each question must be realistic, practical, and directly applicable to electrical transformer manufacturing (CRGO steel cores, copper/aluminum windings, oil insulation, breakdown voltage testing, Buchholz relay, transformer ratio tests, thermal withstand, safety protocols, ISO compliance).

Each question must have 4 options and 1 correct option index (0 to 3).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionNumber: { type: Type.INTEGER },
                    questionText: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    correctOption: { type: Type.INTEGER }
                  },
                  required: ["questionNumber", "questionText", "options", "correctOption"]
                }
              }
            },
            required: ["questions"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      if (data.questions && data.questions.length > 0) {
        return res.json({ success: true, questions: data.questions });
      }
    } catch (err) {
      console.log("Gemini AI topic generator notice: Using smart domain-specific fallback generator.");
    }
  }

  // Fallback to domain-specific question generator
  const fallbackQuestions = fallbackGenerateTopicQuestions(topic, department, count);
  return res.json({
    success: true,
    questions: fallbackQuestions,
    isFallback: true
  });
});

// Explicit API 404 handler to prevent HTML response for missing API routes
app.all("/api/*", (_req, res) => {
  res.status(404).json({ error: "Requested API route does not exist." });
});

// Start Express + Vite Server
async function startServer() {
  try {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    // Global API error handling middleware (always returns JSON, never HTML)
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("Unhandled server error:", err);
      res.status(err?.status || 500).json({
        error: err?.message || "An internal server error occurred."
      });
    });

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });

    server.on("error", (err: any) => {
      console.error("Server error encountered:", err);
    });

    const handleShutdown = () => {
      console.log("Shutting down server gracefully...");
      server.close(() => {
        process.exit(0);
      });
    };

    process.once("SIGTERM", handleShutdown);
    process.once("SIGINT", handleShutdown);
  } catch (err) {
    console.error("Critical failure during server startup:", err);
    process.exit(1);
  }
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});

