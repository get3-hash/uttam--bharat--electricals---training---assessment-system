import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  generateTrainingQRCode,
  downloadQRCodePNG,
  printTrainingQRStandee
} from "../lib/qrGenerator";
import { Training } from "../types";
import { GlassCard } from "../components/GlassCard";
import { TrainingQRModal } from "../components/TrainingQRModal";
import {
  BookOpen,
  PlusCircle,
  QrCode,
  CheckCircle,
  AlertTriangle,
  Trash2,
  ExternalLink,
  Edit,
  Download,
  Copy,
  Check,
  Printer,
  Loader2
} from "lucide-react";

export const TrainingsList: React.FC = () => {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedQr, setSelectedQr] = useState<Training | null>(null);
  const [cardActionLoading, setCardActionLoading] = useState<{ id: string; action: "download" | "print" } | null>(null);

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "trainings"));
      const list: Training[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Training));
      setTrainings(list);
    } catch (err) {
      console.error("Error fetching trainings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQrModal = (t: Training) => {
    setSelectedQr(t);
  };

  const handleQuickDownloadQR = async (e: React.MouseEvent, t: Training) => {
    e.stopPropagation();
    setCardActionLoading({ id: t.id, action: "download" });
    try {
      await downloadQRCodePNG(t.id, t.title);
      setActionSuccess(`Downloaded QR code for "${t.title}".`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      console.error("Quick QR download failed:", err);
      setActionError("Failed to download QR code image.");
      setTimeout(() => setActionError(null), 3500);
    } finally {
      setCardActionLoading(null);
    }
  };

  const handleQuickPrintStandee = async (e: React.MouseEvent, t: Training) => {
    e.stopPropagation();
    setCardActionLoading({ id: t.id, action: "print" });
    try {
      await printTrainingQRStandee({
        id: t.id,
        title: t.title,
        department: t.department,
        trainerName: t.trainerName,
        trainingDate: t.trainingDate,
        description: t.description,
        qrCodeDataUrl: t.qrCodeDataUrl
      });
      setActionSuccess(`Opened print dialog for "${t.title}" standee flyer.`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      console.error("Quick print standee failed:", err);
      setActionError("Failed to open print dialog.");
      setTimeout(() => setActionError(null), 3500);
    } finally {
      setCardActionLoading(null);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteDoc(doc(db, "trainings", deleteTarget.id));
      setTrainings((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setActionSuccess(`Training module "${deleteTarget.title}" deleted successfully.`);
      setDeleteTarget(null);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      console.error("Failed to delete training:", err);
      setActionError("Failed to delete training: " + (err.message || "Permission error or network issue."));
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyLink = (trainingId: string) => {
    const link = `${window.location.origin}/employee/register/${trainingId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(trainingId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#1E1D1C] text-[#2B2A28] dark:text-[#EAEAEA] p-4 sm:p-6 lg:p-8 space-y-6 transition-colors">
      {/* Alert Notifications */}
      {actionSuccess && (
        <div className="bg-[#E6F4FA] border border-[#59B5E2] text-[#006393] p-4 rounded-2xl text-xs font-semibold flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-[#006393] hover:text-[#008DD2] font-bold">✕</button>
        </div>
      )}
      {actionError && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 p-4 rounded-2xl text-xs font-semibold flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#2B2A28] p-6 rounded-2xl border border-[#D5D4D4] dark:border-[#403F3E] shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-[#2B2A28] dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#008DD2]" /> Training Management
          </h1>
          <p className="text-xs text-[#757573] dark:text-[#B5B4B4] mt-1">
            Manage training modules, QR code registrations, and AI-extracted question sets
          </p>
        </div>

        <Link
          to="/admin/create-training"
          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-white flex items-center justify-center gap-2 shadow-md shadow-[#008DD2]/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" /> Create New Training
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#757573] text-sm animate-pulse">
          Loading training sessions...
        </div>
      ) : trainings.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <BookOpen className="w-12 h-12 text-[#757573] mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#2B2A28] dark:text-white">No Training Programs Found</h3>
          <p className="text-xs text-[#757573] dark:text-[#B5B4B4] mt-1 mb-6 max-w-md mx-auto">
            Get started by creating a new training program for Uttam (Bharat) Electricals Pvt. Ltd. You can upload a Question PDF for automatic AI parsing.
          </p>
          <Link
            to="/admin/create-training"
            className="px-5 py-2.5 bg-[#008DD2] hover:bg-[#0078B2] text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 shadow-xs"
          >
            <PlusCircle className="w-4 h-4" /> Create First Training
          </Link>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainings.map((t) => (
            <GlassCard key={t.id} className="p-6 flex flex-col justify-between space-y-4 border border-[#D5D4D4] dark:border-[#403F3E] shadow-xs hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#E6F4FA] dark:bg-[#403F3E] text-[#006393] dark:text-[#59B5E2] border border-[#CCE8F6] dark:border-[#52514E]">
                    {t.department}
                  </span>
                  <span className="text-xs text-[#008DD2] dark:text-[#59B5E2] font-semibold">{t.trainingDate}</span>
                </div>

                <h3 className="text-lg font-bold text-[#2B2A28] dark:text-white line-clamp-2">{t.title}</h3>
                <p className="text-xs text-[#403F3E] dark:text-[#D5D4D4] mt-1">
                  Trainer: <strong className="text-[#008DD2] dark:text-[#59B5E2] font-bold">{t.trainerName}</strong>
                </p>

                <p className="text-xs text-[#757573] dark:text-[#B5B4B4] mt-2 line-clamp-2 leading-relaxed">
                  {t.description || "No description provided."}
                </p>

                {/* Question & Answer Key Status */}
                <div className="mt-4 pt-3 border-t border-[#EAEAEA] dark:border-[#403F3E] flex items-center justify-between text-xs">
                  <span className="text-[#403F3E] dark:text-[#D5D4D4] font-medium flex items-center gap-1.5">
                    <span>Questions:</span>
                    <strong className="text-[#008DD2] dark:text-[#59B5E2] font-black text-sm">{t.questions?.length || 0}</strong>
                  </span>

                  {t.isAnswerKeyComplete ? (
                    <span className="px-2 py-0.5 rounded-md bg-[#E6F4FA] dark:bg-[#403F3E] text-[#006393] dark:text-[#59B5E2] border border-[#59B5E2]/40 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5 text-[#008DD2]" /> Answer Key Set
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-[#EAEAEA] dark:bg-[#403F3E] text-[#403F3E] dark:text-[#D5D4D4] border border-[#D5D4D4] dark:border-[#52514E] font-bold flex items-center gap-1 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#757573]" /> Review Needed
                    </span>
                  )}
                </div>
              </div>

              {/* Card Action Controls */}
              <div className="pt-3 border-t border-[#EAEAEA] dark:border-[#403F3E] space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleOpenQrModal(t)}
                    className="py-2.5 px-3 rounded-xl bg-[#E6F4FA] hover:bg-[#CCE8F6] text-[#006393] border border-[#59B5E2] text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title="View QR Code, Print Standee Flyer & Download Assets"
                  >
                    <QrCode className="w-4 h-4 text-[#006393]" /> QR & Standee
                  </button>

                  <Link
                    to={`/admin/review-questions/${t.id}`}
                    className="py-2.5 px-3 rounded-xl bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    title={`Review ${t.questions?.length || 0} Questions and Answer Key`}
                  >
                    <Edit className="w-4 h-4 text-white" /> Questions ({t.questions?.length || 0})
                  </Link>
                </div>

                {/* Quick Shortcuts Bar */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-[#EAEAEA] dark:border-[#403F3E]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={cardActionLoading?.id === t.id}
                      onClick={(e) => handleQuickDownloadQR(e, t)}
                      className="px-2 py-1 rounded-lg bg-[#EAEAEA] hover:bg-[#D5D4D4] dark:bg-[#403F3E] dark:hover:bg-[#52514E] text-[#403F3E] dark:text-[#EAEAEA] text-[10.5px] font-bold flex items-center gap-1 transition-colors border border-[#D5D4D4] dark:border-[#52514E] cursor-pointer"
                      title="Direct Download High-Res QR Code (PNG)"
                    >
                      {cardActionLoading?.id === t.id && cardActionLoading?.action === "download" ? (
                        <Loader2 className="w-3 h-3 animate-spin text-[#008DD2]" />
                      ) : (
                        <Download className="w-3 h-3 text-[#008DD2]" />
                      )}
                      <span>Download QR</span>
                    </button>

                    <button
                      type="button"
                      disabled={cardActionLoading?.id === t.id}
                      onClick={(e) => handleQuickPrintStandee(e, t)}
                      className="px-2 py-1 rounded-lg bg-[#EAEAEA] hover:bg-[#D5D4D4] dark:bg-[#403F3E] dark:hover:bg-[#52514E] text-[#403F3E] dark:text-[#EAEAEA] text-[10.5px] font-bold flex items-center gap-1 transition-colors border border-[#D5D4D4] dark:border-[#52514E] cursor-pointer"
                      title="Quick Print A4 Training Standee Flyer"
                    >
                      {cardActionLoading?.id === t.id && cardActionLoading?.action === "print" ? (
                        <Loader2 className="w-3 h-3 animate-spin text-[#008DD2]" />
                      ) : (
                        <Printer className="w-3 h-3 text-[#008DD2]" />
                      )}
                      <span>Print Standee</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(t.id)}
                      className="text-[11px] text-[#757573] hover:text-[#008DD2] flex items-center gap-1 font-medium transition-colors cursor-pointer"
                      title="Copy registration link for WhatsApp or email"
                    >
                      {copiedId === t.id ? (
                        <span className="text-[#008DD2] flex items-center gap-1 font-bold">
                          <Check className="w-3 h-3" /> Copied!
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy className="w-3 h-3" /> Link
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setDeleteTarget({ id: t.id, title: t.title })}
                      className="text-[11px] text-rose-500 hover:text-rose-700 flex items-center gap-1 p-1 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                      title="Delete training program"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Full-featured QR Code & Standee Flyer Modal */}
      {selectedQr && (
        <TrainingQRModal
          training={selectedQr}
          onClose={() => setSelectedQr(null)}
        />
      )}

      {/* Session Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-[#2B2A28]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2B2A28] border border-[#D5D4D4] dark:border-[#403F3E] rounded-2xl max-w-md w-full p-6 text-center shadow-2xl relative space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#2B2A28] dark:text-white">Delete Training Program?</h3>
              <p className="text-xs text-[#757573] dark:text-[#B5B4B4] mt-1">
                Are you sure you want to permanently delete <strong className="text-[#2B2A28] dark:text-white">"{deleteTarget.title}"</strong>?
              </p>
              <p className="text-[11px] text-rose-600 mt-2 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                Warning: This action cannot be undone and will remove the session from the database.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-[#EAEAEA] hover:bg-[#D5D4D4] text-[#2B2A28] font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Yes, Delete Session
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
