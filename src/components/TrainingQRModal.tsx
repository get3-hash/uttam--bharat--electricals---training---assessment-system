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
          darkColor: "#2B2A28"
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
    <div className="fixed inset-0 bg-[#2B2A28]/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#FFFFFF] border border-[#D5D4D4] rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 bg-[#2B2A28] text-[#FFFFFF] flex items-start justify-between gap-4 border-b border-[#403F3E]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#008DD2] text-[#FFFFFF]">
                Official QR Portal
              </span>
              <span className="text-xs text-[#CCE8F6] flex items-center gap-1 font-medium">
                <Building2 className="w-3.5 h-3.5" /> {training.department}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#FFFFFF] line-clamp-1">
              {training.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#D5D4D4]">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#59B5E2]" /> Trainer: <strong>{training.trainerName}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#59B5E2]" /> Date: <strong>{training.trainingDate}</strong>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#D5D4D4] hover:text-[#FFFFFF] hover:bg-[#403F3E] transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification Toast */}
        {statusMessage && (
          <div className="bg-[#E6F4FA] border-b border-[#59B5E2] px-4 py-2 text-xs font-semibold text-[#006393] flex items-center justify-center gap-2">
            <Info className="w-4 h-4 text-[#008DD2] shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Tab Switcher */}
          <div className="flex bg-[#EAEAEA] p-1 rounded-xl text-xs font-bold text-[#403F3E]">
            <button
              onClick={() => setActiveTab("flyer")}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "flyer"
                  ? "bg-[#008DD2] text-[#FFFFFF] shadow-xs font-black"
                  : "hover:text-[#2B2A28]"
              }`}
            >
              <FileImage className="w-4 h-4" /> Standee Flyer View (Print Ready)
            </button>
            <button
              onClick={() => setActiveTab("qr")}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "qr"
                  ? "bg-[#008DD2] text-[#FFFFFF] shadow-xs font-black"
                  : "hover:text-[#2B2A28]"
              }`}
            >
              <QrCode className="w-4 h-4" /> Standalone QR Code
            </button>
          </div>

          {/* TAB 1: STANDEE FLYER PREVIEW */}
          {activeTab === "flyer" && (
            <div className="border border-[#D5D4D4] rounded-2xl overflow-hidden bg-[#FFFFFF] text-[#2B2A28] shadow-xs">
              {/* Flyer Header Banner */}
              <div className="bg-[#2B2A28] text-[#FFFFFF] p-4 text-center border-b-2 border-[#008DD2]">
                <div className="bg-[#403F3E] py-1.5 px-3 rounded-xl inline-block mb-2 border border-[#757573]">
                  <CompanyLogo variant="compact" darkBg={true} height={28} />
                </div>
                <div className="text-xs sm:text-sm font-black tracking-wider uppercase">
                  UTTAM (BHARAT) ELECTRICALS PVT. LTD.
                </div>
                <div className="text-[10px] text-[#59B5E2] tracking-widest font-semibold mt-0.5">
                  UTTAM® • POWER AND DISTRIBUTION TRANSFORMERS • JAIPUR
                </div>
              </div>

              {/* Flyer Body */}
              <div className="p-4 sm:p-6 text-center flex flex-col items-center space-y-4">
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[#E6F4FA] text-[#006393] border border-[#59B5E2]">
                  Official Training Registration & Assessment Portal
                </span>

                <h3 className="text-base sm:text-lg font-black text-[#2B2A28] max-w-md leading-snug">
                  {training.title}
                </h3>

                <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-[#403F3E]">
                  <span className="bg-[#EAEAEA] px-2.5 py-1 rounded-md border border-[#D5D4D4]">
                    Dept: <strong>{training.department}</strong>
                  </span>
                  <span className="bg-[#EAEAEA] px-2.5 py-1 rounded-md border border-[#D5D4D4]">
                    Trainer: <strong>{training.trainerName}</strong>
                  </span>
                  <span className="bg-[#EAEAEA] px-2.5 py-1 rounded-md border border-[#D5D4D4]">
                    Date: <strong>{training.trainingDate}</strong>
                  </span>
                </div>

                {/* Big Center QR Frame */}
                <div className="p-3 bg-[#FFFFFF] border-2 border-[#008DD2] rounded-2xl shadow-xs relative group">
                  {loadingQr ? (
                    <div className="w-48 h-48 sm:w-56 sm:h-56 flex flex-col items-center justify-center bg-[#E6F4FA] rounded-xl">
                      <Loader2 className="w-8 h-8 text-[#008DD2] animate-spin" />
                      <span className="text-xs text-[#757573] mt-2 font-medium">Generating QR...</span>
                    </div>
                  ) : (
                    <img
                      src={qrUrl}
                      alt="Training Registration QR Code"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl"
                    />
                  )}
                </div>

                <div className="text-[#008DD2] font-extrabold text-sm flex items-center justify-center gap-1.5">
                  <span>📷 Scan With Smartphone Camera to Register</span>
                </div>

                {/* Step Instructions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full pt-2 border-t border-[#D5D4D4] text-left">
                  <div className="bg-[#EAEAEA] p-2.5 rounded-xl border border-[#D5D4D4]">
                    <div className="w-5 h-5 rounded-full bg-[#008DD2] text-[#FFFFFF] text-[10px] font-bold flex items-center justify-center mb-1">
                      1
                    </div>
                    <div className="text-xs font-bold text-[#2B2A28]">Scan QR</div>
                    <div className="text-[10px] text-[#757573]">Open camera or Google Lens. No login needed.</div>
                  </div>
                  <div className="bg-[#EAEAEA] p-2.5 rounded-xl border border-[#D5D4D4]">
                    <div className="w-5 h-5 rounded-full bg-[#008DD2] text-[#FFFFFF] text-[10px] font-bold flex items-center justify-center mb-1">
                      2
                    </div>
                    <div className="text-xs font-bold text-[#2B2A28]">Enter Details</div>
                    <div className="text-[10px] text-[#757573]">Provide Employee Code, Name & Department.</div>
                  </div>
                  <div className="bg-[#EAEAEA] p-2.5 rounded-xl border border-[#D5D4D4]">
                    <div className="w-5 h-5 rounded-full bg-[#008DD2] text-[#FFFFFF] text-[10px] font-bold flex items-center justify-center mb-1">
                      3
                    </div>
                    <div className="text-xs font-bold text-[#2B2A28]">Quiz & Feedback</div>
                    <div className="text-[10px] text-[#757573]">Take quiz assessment and submit feedback.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PURE QR CODE */}
          {activeTab === "qr" && (
            <div className="flex flex-col items-center justify-center p-8 bg-[#EAEAEA] rounded-2xl border border-[#D5D4D4] space-y-4">
              <div className="p-4 bg-[#FFFFFF] rounded-3xl shadow-sm border border-[#D5D4D4]">
                {loadingQr ? (
                  <div className="w-64 h-64 flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-[#008DD2] animate-spin" />
                    <span className="text-xs text-[#757573] mt-2 font-medium">Generating high-res QR...</span>
                  </div>
                ) : (
                  <img
                    src={qrUrl}
                    alt="High Resolution QR Code"
                    className="w-64 h-64 object-contain rounded-xl"
                  />
                )}
              </div>
              <p className="text-xs text-[#757573] text-center max-w-sm">
                High-resolution corporate QR code generated specifically for this training program. Can be embedded into PowerPoint presentations, PDF handouts, or notice board flyers.
              </p>
            </div>
          )}

          {/* Direct URL Box */}
          <div className="bg-[#E6F4FA] p-3 rounded-2xl border border-[#59B5E2] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="w-full sm:w-auto truncate">
              <span className="text-[10px] text-[#757573] uppercase tracking-wider block font-bold">
                Employee Direct Registration URL
              </span>
              <code className="text-[#006393] font-mono text-[11px] truncate block">
                {registrationUrl}
              </code>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#CCE8F6] text-[#006393] rounded-xl border border-[#59B5E2] font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#008DD2]" /> Copied!
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
                className="px-3 py-1.5 bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-[#FFFFFF] rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Test Portal
              </a>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-4 sm:p-5 bg-[#FFFFFF] border-t border-[#D5D4D4] flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-[#757573] hidden sm:block">
            Print on A4 paper or download poster graphic
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Download QR PNG */}
            <button
              type="button"
              disabled={isDownloadingQr || loadingQr}
              onClick={handleDownloadQR}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-[#EAEAEA] hover:bg-[#D5D4D4] text-[#403F3E] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              title="Download standalone transparent/high-res QR code image"
            >
              {isDownloadingQr ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <QrCode className="w-4 h-4 text-[#008DD2]" />
              )}
              Download QR
            </button>

            {/* Download Standee Poster PNG */}
            <button
              type="button"
              disabled={isDownloadingPoster || loadingQr}
              onClick={handleDownloadPoster}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-[#E6F4FA] hover:bg-[#CCE8F6] text-[#006393] border border-[#59B5E2] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
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
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-[#FFFFFF] font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
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
