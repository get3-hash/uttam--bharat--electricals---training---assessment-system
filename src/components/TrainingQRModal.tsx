import React, { useState, useEffect } from "react";
import { Training } from "../types";
import {
  generateTrainingQRCode,
  downloadQRCodePNG,
  printTrainingQRStandee,
  downloadTrainingStandeePNG
} from "../lib/qrGenerator";
import { CompanyLogo } from "./CompanyLogo";
import {
  QrCode,
  Printer,
  Download,
  Copy,
  Check,
  ExternalLink,
  X,
  FileImage,
  Sparkles,
  Info,
  Calendar,
  User,
  Building2,
  Loader2
} from "lucide-react";

interface TrainingQRModalProps {
  training: Training | null;
  onClose: () => void;
}

export const TrainingQRModal: React.FC<TrainingQRModalProps> = ({ training, onClose }) => {
  const [activeTab, setActiveTab] = useState<"flyer" | "qr">("flyer");
  const [qrUrl, setQrUrl] = useState<string>("");
  const [loadingQr, setLoadingQr] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isDownloadingPoster, setIsDownloadingPoster] = useState<boolean>(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!training) return;

    let isMounted = true;
    async function loadQR() {
      setLoadingQr(true);
      try {
        const url = await generateTrainingQRCode(training.id, {
          width: 512,
          preferPng: true,
          darkColor: "#0F2942"
        });
        if (isMounted) {
          setQrUrl(url);
          setLoadingQr(false);
        }
      } catch (err) {
        console.error("Failed to generate QR in modal:", err);
        if (isMounted) setLoadingQr(false);
      }
    }

    loadQR();
    return () => {
      isMounted = false;
    };
  }, [training]);

  if (!training) return null;

  const registrationUrl = `${window.location.origin}/employee/register/${training.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(registrationUrl);
    setCopiedLink(true);
    setStatusMessage("Registration portal link copied to clipboard!");
    setTimeout(() => {
      setCopiedLink(false);
      setStatusMessage(null);
    }, 2500);
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    setStatusMessage("Preparing print-ready standee flyer...");
    try {
      await printTrainingQRStandee({
        id: training.id,
        title: training.title,
        department: training.department,
        trainerName: training.trainerName,
        trainingDate: training.trainingDate,
        description: training.description,
        qrCodeDataUrl: qrUrl
      });
      setStatusMessage("Print dialog opened. Ready to print!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e: any) {
      console.error("Print error:", e);
      setStatusMessage("Could not open print window automatically.");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPoster = async () => {
    setIsDownloadingPoster(true);
    setStatusMessage("Generating high-resolution standee poster image...");
    try {
      await downloadTrainingStandeePNG({
        id: training.id,
        title: training.title,
        department: training.department,
        trainerName: training.trainerName,
        trainingDate: training.trainingDate,
        qrCodeDataUrl: qrUrl
      });
      setStatusMessage("Standee poster downloaded successfully!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      console.error("Download poster error:", e);
      setStatusMessage("Failed to generate standee poster.");
    } finally {
      setIsDownloadingPoster(false);
    }
  };

  const handleDownloadQR = async () => {
    setIsDownloadingQr(true);
    setStatusMessage("Preparing high-res QR code PNG...");
    try {
      await downloadQRCodePNG(training.id, training.title, 800);
      setStatusMessage("QR code PNG image downloaded!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      console.error("Download QR error:", e);
      setStatusMessage("Failed to download QR code image.");
    } finally {
      setIsDownloadingQr(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-start justify-between gap-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950">
                Official QR Portal
              </span>
              <span className="text-xs text-blue-200 flex items-center gap-1 font-medium">
                <Building2 className="w-3.5 h-3.5" /> {training.department}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white line-clamp-1">
              {training.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-400" /> Trainer: <strong>{training.trainerName}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Date: <strong>{training.trainingDate}</strong>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification Toast */}
        {statusMessage && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800/50 px-4 py-2 text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center justify-center gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Tab Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setActiveTab("flyer")}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === "flyer"
                  ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-amber-300 shadow-xs font-black"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileImage className="w-4 h-4" /> Standee Flyer View (Print Ready)
            </button>
            <button
              onClick={() => setActiveTab("qr")}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === "qr"
                  ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-amber-300 shadow-xs font-black"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <QrCode className="w-4 h-4" /> Standalone QR Code
            </button>
          </div>

          {/* TAB 1: STANDEE FLYER PREVIEW */}
          {activeTab === "flyer" && (
            <div className="border-2 border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden bg-white text-slate-900 shadow-md">
              {/* Flyer Header Banner */}
              <div className="bg-gradient-to-r from-[#0F2942] to-[#1E3A8A] text-white p-4 text-center border-b-4 border-sky-400">
                <div className="bg-white/10 backdrop-blur-xs py-1.5 px-3 rounded-xl inline-block mb-2 border border-white/20">
                  <CompanyLogo variant="compact" darkBg={true} height={28} />
                </div>
                <div className="text-xs sm:text-sm font-black tracking-wider uppercase">
                  UTTAM (BHARAT) ELECTRICALS PVT. LTD.
                </div>
                <div className="text-[10px] text-sky-200 tracking-widest font-semibold mt-0.5">
                  UTTAM® • POWER AND DISTRIBUTION TRANSFORMERS • JAIPUR
                </div>
              </div>

              {/* Flyer Body */}
              <div className="p-4 sm:p-6 text-center flex flex-col items-center space-y-4">
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-blue-50 text-blue-800 border border-blue-200">
                  Official Training Registration & Assessment Portal
                </span>

                <h3 className="text-base sm:text-lg font-black text-slate-900 max-w-md leading-snug">
                  {training.title}
                </h3>

                <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-600">
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    Dept: <strong>{training.department}</strong>
                  </span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    Trainer: <strong>{training.trainerName}</strong>
                  </span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    Date: <strong>{training.trainingDate}</strong>
                  </span>
                </div>

                {/* Big Center QR Frame */}
                <div className="p-3 bg-white border-2 border-blue-900 rounded-2xl shadow-lg relative group">
                  {loadingQr ? (
                    <div className="w-48 h-48 sm:w-56 sm:h-56 flex flex-col items-center justify-center bg-slate-50 rounded-xl">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <span className="text-xs text-slate-500 mt-2 font-medium">Generating QR...</span>
                    </div>
                  ) : (
                    <img
                      src={qrUrl}
                      alt="Training Registration QR Code"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl"
                    />
                  )}
                </div>

                <div className="text-amber-700 font-extrabold text-sm flex items-center justify-center gap-1.5">
                  <span>📷 Scan With Smartphone Camera to Register</span>
                </div>

                {/* Step Instructions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full pt-2 border-t border-slate-200 text-left">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="w-5 h-5 rounded-full bg-[#0F2942] text-white text-[10px] font-bold flex items-center justify-center mb-1">
                      1
                    </div>
                    <div className="text-xs font-bold text-slate-900">Scan QR</div>
                    <div className="text-[10px] text-slate-500">Open camera or Google Lens. No login needed.</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="w-5 h-5 rounded-full bg-[#0F2942] text-white text-[10px] font-bold flex items-center justify-center mb-1">
                      2
                    </div>
                    <div className="text-xs font-bold text-slate-900">Enter Details</div>
                    <div className="text-[10px] text-slate-500">Provide Employee Code, Name & Department.</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="w-5 h-5 rounded-full bg-[#0F2942] text-white text-[10px] font-bold flex items-center justify-center mb-1">
                      3
                    </div>
                    <div className="text-xs font-bold text-slate-900">Quiz & Feedback</div>
                    <div className="text-[10px] text-slate-500">Take quiz assessment and submit feedback.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PURE QR CODE */}
          {activeTab === "qr" && (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="p-4 bg-white rounded-3xl shadow-xl border-4 border-slate-200 dark:border-slate-700">
                {loadingQr ? (
                  <div className="w-64 h-64 flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <span className="text-xs text-slate-500 mt-2 font-medium">Generating high-res QR...</span>
                  </div>
                ) : (
                  <img
                    src={qrUrl}
                    alt="High Resolution QR Code"
                    className="w-64 h-64 object-contain rounded-xl"
                  />
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-sm">
                High-resolution corporate QR code generated specifically for this training program. Can be embedded into PowerPoint presentations, PDF handouts, or notice board flyers.
              </p>
            </div>
          )}

          {/* Direct URL Box */}
          <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="w-full sm:w-auto truncate">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                Employee Direct Registration URL
              </span>
              <code className="text-blue-700 dark:text-blue-300 font-mono text-[11px] truncate block">
                {registrationUrl}
              </code>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </>
                )}
              </button>
              <a
                href={`/employee/register/${training.id}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Test Portal
              </a>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Print on A4 paper or download poster graphic
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Download QR PNG */}
            <button
              type="button"
              disabled={isDownloadingQr || loadingQr}
              onClick={handleDownloadQR}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              title="Download standalone transparent/high-res QR code image"
            >
              {isDownloadingQr ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
              Download QR
            </button>

            {/* Download Standee Poster PNG */}
            <button
              type="button"
              disabled={isDownloadingPoster || loadingQr}
              onClick={handleDownloadPoster}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              title="Download high-resolution branded standee poster image (PNG)"
            >
              {isDownloadingPoster ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Save Poster
            </button>

            {/* Print Standee Flyer Button */}
            <button
              type="button"
              disabled={isPrinting || loadingQr}
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 active:scale-95"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Printing...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" /> Print Flyer / Standee
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
