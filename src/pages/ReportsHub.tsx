import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Training, EmployeeRegistration, QuizAttempt, TrainingFeedback } from "../types";
import { exportTrainingReportToExcel } from "../lib/excelExport";
import { exportTrainingReportToGoogleSheets, copyDataForGoogleSheets } from "../lib/googleSheetExport";
import { generateTrainingSummaryReportPdf } from "../lib/pdfGenerator";
import { GlassCard } from "../components/GlassCard";
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  Star,
  BookOpen,
  Building2,
  FileText,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  List,
  Grid,
  Trash2,
  Loader2,
  ExternalLink,
  Zap,
} from "lucide-react";

export const ReportsHub: React.FC = () => {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [registrations, setRegistrations] = useState<EmployeeRegistration[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [feedbacks, setFeedbacks] = useState<TrainingFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  // Assessment Delete state
  const [deleteAttemptTarget, setDeleteAttemptTarget] = useState<{
    id: string;
    name: string;
    code: string;
    score: string;
  } | null>(null);
  const [deletingAttempt, setDeletingAttempt] = useState(false);

  const confirmDeleteAttempt = async () => {
    if (!deleteAttemptTarget) return;
    setDeletingAttempt(true);
    try {
      await deleteDoc(doc(db, "quiz_attempts", deleteAttemptTarget.id));
      setAttempts((prev) => prev.filter((a) => a.id !== deleteAttemptTarget.id));
      setDeleteAttemptTarget(null);
    } catch (err) {
      console.error("Error deleting quiz attempt from ReportsHub:", err);
      alert("Failed to delete assessment attempt: " + (err as any).message);
    } finally {
      setDeletingAttempt(false);
    }
  };

  // View Mode: "folders" (har session ka alag folder) vs "all_table" (flat table)
  const [viewMode, setViewMode] = useState<"folders" | "all_table">("folders");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [folderSubTabs, setFolderSubTabs] = useState<Record<string, "registrations" | "quiz" | "feedback">>({});

  // Filters for flat table mode
  const [activeTab, setActiveTab] = useState<"registrations" | "quiz" | "feedback">("registrations");
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const tSnap = await getDocs(collection(db, "trainings"));
      const tList: Training[] = tSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Training));
      setTrainings(tList);

      // Default expand all session folders
      const initialExpanded: Record<string, boolean> = {};
      const initialSubTabs: Record<string, "registrations" | "quiz" | "feedback"> = {};
      tList.forEach((t, idx) => {
        initialExpanded[t.id] = idx === 0; // expand first folder by default, others collapsible
        initialSubTabs[t.id] = "registrations";
      });
      setExpandedFolders(initialExpanded);
      setFolderSubTabs(initialSubTabs);

      const rSnap = await getDocs(collection(db, "registrations"));
      const rList: EmployeeRegistration[] = rSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as EmployeeRegistration)
      );
      setRegistrations(rList);

      const qSnap = await getDocs(collection(db, "quiz_attempts"));
      const qList: QuizAttempt[] = qSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as QuizAttempt)
      );
      setAttempts(qList);

      const fSnap = await getDocs(collection(db, "feedbacks"));
      const fList: TrainingFeedback[] = fSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as TrainingFeedback)
      );
      setFeedbacks(fList);
    } catch (err) {
      console.error("Error loading report data:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (trainingId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [trainingId]: !prev[trainingId]
    }));
  };

  const setFolderSubTab = (trainingId: string, tab: "registrations" | "quiz" | "feedback") => {
    setFolderSubTabs((prev) => ({
      ...prev,
      [trainingId]: tab
    }));
  };

  // Filtered Registrations for flat table
  const filteredRegistrations = registrations.filter((reg) => {
    const matchesTraining = selectedTrainingId === "all" || reg.trainingId === selectedTrainingId;
    const matchesDept = selectedDepartment === "all" || reg.department === selectedDepartment;
    const matchesSearch =
      !searchQuery ||
      reg.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTraining && matchesDept && matchesSearch;
  });

  // Export specific session folder to Google Sheets
  const handleExportSessionGoogleSheet = (training: Training) => {
    const sessionRegs = registrations.filter((r) => r.trainingId === training.id);
    const sessionFb = feedbacks.filter((f) => f.trainingId === training.id);
    const sessionQuiz = attempts.filter((q) => q.trainingId === training.id);
    exportTrainingReportToGoogleSheets(training, sessionRegs, sessionFb, sessionQuiz);
  };

  // Export specific session folder to PDF
  const handleExportSessionPdf = (training: Training) => {
    const sessionRegs = registrations.filter((r) => r.trainingId === training.id);
    const sessionFb = feedbacks.filter((f) => f.trainingId === training.id);
    const sessionQuiz = attempts.filter((q) => q.trainingId === training.id);
    generateTrainingSummaryReportPdf(training, sessionRegs, sessionFb, sessionQuiz);
  };

  // Global Google Sheets Export
  const handleExportGoogleSheet = () => {
    const activeTraining = trainings.find((t) => t.id === selectedTrainingId) || trainings[0];
    if (!activeTraining) {
      alert("No active training selected for export.");
      return;
    }
    exportTrainingReportToGoogleSheets(activeTraining, registrations, feedbacks, attempts);
  };

  // Global Summary PDF Export
  const handleExportPdf = () => {
    const activeTraining = trainings.find((t) => t.id === selectedTrainingId) || trainings[0];
    if (!activeTraining) {
      alert("No active training selected for export.");
      return;
    }
    generateTrainingSummaryReportPdf(activeTraining, registrations, feedbacks, attempts);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 transition-colors">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> Master Reports & Analytics Hub
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Uttam (Bharat) Electricals Pvt. Ltd. • Export Registrations, Quiz Performance & Feedback Data
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/settings?tab=googlesheets"
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            title="Configure Live Google Sheets Synchronization by Department"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Google Sheets Live Sync</span>
          </Link>
          <button
            onClick={handleExportGoogleSheet}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            title="Save data formatted for Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4" /> Save to Google Sheets
          </button>
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
          >
            <FileText className="w-4 h-4" /> Export PDF Report
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* View Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("folders")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === "folders"
                ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
            }`}
          >
            <FolderOpen className="w-4 h-4" /> Session Folders View
          </button>
          <button
            onClick={() => setViewMode("all_table")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === "all_table"
                ? "bg-blue-600 text-white shadow-md font-extrabold"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
            }`}
          >
            <List className="w-4 h-4" /> Combined All Table View
          </button>
        </div>

        {viewMode === "all_table" && (
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing flat combined records across all sessions
          </div>
        )}
      </div>

      {viewMode === "folders" ? (
        /* SESSION FOLDERS VIEW (HAR SESSION KA ALAG FOLDER) */
        <div className="space-y-6">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
              Loading session folders directory...
            </div>
          ) : trainings.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Folder className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No Session Folders Created</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Create a training session to automatically generate a dedicated folder for registrations, test results, and feedback.
              </p>
            </GlassCard>
          ) : (
            trainings.map((t) => {
              const sRegs = registrations.filter((r) => r.trainingId === t.id);
              const sQuiz = attempts.filter((q) => q.trainingId === t.id);
              const sFb = feedbacks.filter((f) => f.trainingId === t.id);

              const passCount = sQuiz.filter((q) => q.passed).length;
              const sPassRate = sQuiz.length > 0 ? Math.round((passCount / sQuiz.length) * 100) : 0;
              const isExpanded = !!expandedFolders[t.id];
              const currSubTab = folderSubTabs[t.id] || "registrations";

              return (
                <div
                  key={t.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl transition-all"
                >
                  {/* Folder Top Header Bar */}
                  <div className="p-5 bg-slate-50/90 dark:bg-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-start gap-3.5">
                      <button
                        type="button"
                        onClick={() => toggleFolder(t.id)}
                        className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 hover:bg-amber-500/20 transition-all mt-0.5"
                      >
                        {isExpanded ? (
                          <FolderOpen className="w-5 h-5 text-amber-500" />
                        ) : (
                          <Folder className="w-5 h-5 text-amber-500" />
                        )}
                      </button>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 flex items-center gap-1">
                            <Folder className="w-3 h-3 text-amber-600 dark:text-amber-400" /> {t.folderName || "Session Folder"}
                          </span>
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30">
                            {t.department}
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                            📅 {t.trainingDate}
                          </span>
                        </div>

                        <h3
                          onClick={() => toggleFolder(t.id)}
                          className="text-base font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-amber-300 cursor-pointer transition-all flex items-center gap-2"
                        >
                          {t.title}
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          )}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          Trainer: <strong className="text-slate-900 dark:text-slate-200">{t.trainerName}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Folder Quick Action Stats */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2.5 bg-white dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
                        <span className="text-slate-600 dark:text-slate-400">
                          Regs: <strong className="text-slate-900 dark:text-white">{sRegs.length}</strong>
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-slate-600 dark:text-slate-400">
                          Tests: <strong className="text-amber-600 dark:text-amber-300">{sQuiz.length}</strong>
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-slate-600 dark:text-slate-400">
                          Pass Rate:{" "}
                          <strong className={sPassRate >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                            {sPassRate}%
                          </strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleExportSessionGoogleSheet(t)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                        title="Save and export Session records for Google Sheets"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Save to Google Sheet
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportSessionPdf(t)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/20 dark:hover:bg-blue-600/40 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-2xs"
                        title="Export Session PDF"
                      >
                        <FileText className="w-3.5 h-3.5" /> PDF Summary
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFolder(t.id)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs"
                      >
                        {isExpanded ? "Collapse Folder" : "Open Folder"}
                      </button>
                    </div>
                  </div>

                  {/* Folder Contents */}
                  {isExpanded && (
                    <div className="p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800/80">
                      {/* Folder Internal Sub-tabs */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setFolderSubTab(t.id, "registrations")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              currSubTab === "registrations"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-white hover:bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700/60 shadow-2xs"
                            }`}
                          >
                            <Users className="w-3.5 h-3.5" /> 📁 1. Registrations ({sRegs.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setFolderSubTab(t.id, "quiz")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              currSubTab === "quiz"
                                ? "bg-amber-600 text-white shadow-sm"
                                : "bg-white hover:bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700/60 shadow-2xs"
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> 📁 2. Quiz Results & Answers ({sQuiz.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setFolderSubTab(t.id, "feedback")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              currSubTab === "feedback"
                                ? "bg-purple-600 text-white shadow-sm"
                                : "bg-white hover:bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700/60 shadow-2xs"
                            }`}
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> 📁 3. Feedbacks ({sFb.length})
                          </button>
                        </div>

                        <a
                          href={`/employee/register/${t.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          🔗 QR Registration Link
                        </a>
                      </div>

                      {/* Folder Sub Tab Content */}
                      {currSubTab === "registrations" ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 uppercase text-[11px] font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="p-3">Emp Code</th>
                                <th className="p-3">Employee Name</th>
                                <th className="p-3">Department</th>
                                <th className="p-3">Designation</th>
                                <th className="p-3">Registered At</th>
                                <th className="p-3 text-right">Quiz Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                              {sRegs.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-6 text-center text-slate-500 dark:text-slate-400 font-medium">
                                    No registrations recorded in this session folder yet.
                                  </td>
                                </tr>
                              ) : (
                                sRegs.map((reg) => {
                                  const att = sQuiz.find((a) => a.registrationId === reg.id);
                                  return (
                                    <tr key={reg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                      <td className="p-3 font-bold text-slate-900 dark:text-amber-400 text-xs font-mono">{reg.employeeCode}</td>
                                      <td className="p-3 font-bold text-slate-900 dark:text-white text-xs">{reg.employeeName}</td>
                                      <td className="p-3 text-slate-800 dark:text-sky-200 font-semibold text-xs">{reg.department}</td>
                                      <td className="p-3 text-slate-700 dark:text-cyan-300 font-medium text-xs">{reg.designation}</td>
                                      <td className="p-3 text-slate-800 dark:text-slate-100 font-medium text-xs">
                                        {new Date(reg.registeredAt).toLocaleString()}
                                      </td>
                                      <td className="p-3 text-right">
                                        {att ? (
                                          att.passed ? (
                                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/40 shadow-2xs">
                                              PASSED ({att.percentage}%)
                                            </span>
                                          ) : (
                                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/40 shadow-2xs">
                                              FAILED ({att.percentage}%)
                                            </span>
                                          )
                                        ) : (
                                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 inline-block tracking-wide shadow-2xs">
                                            PENDING QUIZ
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : currSubTab === "quiz" ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 uppercase text-[11px] font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="p-3">Emp Code</th>
                                <th className="p-3">Employee Name</th>
                                <th className="p-3">Score</th>
                                <th className="p-3">Percentage</th>
                                <th className="p-3">Time</th>
                                <th className="p-3">Warnings</th>
                                <th className="p-3 text-right">Detailed Answers</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                              {sQuiz.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="p-6 text-center text-slate-500 dark:text-slate-400 font-medium">
                                    No quiz attempts recorded in this session folder yet.
                                  </td>
                                </tr>
                              ) : (
                                sQuiz.map((att) => {
                                  const matchedReg = registrations.find(
                                    (r) => r.id === att.registrationId || (att.employeeCode && r.employeeCode === att.employeeCode)
                                  );
                                  const displayName = att.employeeName?.trim() || matchedReg?.employeeName?.trim() || "Candidate";
                                  const initials = displayName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase();

                                  return (
                                    <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                      <td className="p-3 font-bold text-slate-900 dark:text-amber-400 text-xs font-mono">{att.employeeCode || matchedReg?.employeeCode || "N/A"}</td>
                                      <td className="p-3 font-bold text-slate-900 dark:text-white text-xs">
                                        <div className="flex items-center gap-2">
                                          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-xs">
                                            {initials}
                                          </span>
                                          <span>{displayName}</span>
                                        </div>
                                      </td>
                                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100 text-xs">
                                        {att.score} / {att.totalQuestions}
                                      </td>
                                      <td className="p-3 font-bold text-slate-900 dark:text-amber-300 text-xs">{att.percentage}%</td>
                                      <td className="p-3 text-slate-800 dark:text-slate-200 font-medium text-xs">{att.attemptTimeSeconds || 0}s</td>
                                      <td className="p-3">
                                        {att.tabSwitches > 0 ? (
                                          <span className="text-rose-600 dark:text-rose-400 font-bold">{att.tabSwitches}</span>
                                        ) : (
                                          <span className="text-slate-700 dark:text-slate-300 font-medium">0</span>
                                        )}
                                      </td>
                                      <td className="p-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          {att.passed ? (
                                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/40 shadow-2xs">
                                              PASSED
                                            </span>
                                          ) : (
                                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/40 shadow-2xs">
                                              FAILED
                                            </span>
                                          )}
                                          <a
                                            href={`/employee/certificate/${att.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-300 text-[10px] font-bold rounded-lg border border-amber-300 dark:border-amber-500/40 transition-all flex items-center gap-1 shadow-2xs"
                                            title="Check wrong/correct questions and selected option"
                                          >
                                            <FileText className="w-3 h-3" /> View Answers
                                          </a>
                                          <button
                                            onClick={() =>
                                              setDeleteAttemptTarget({
                                                id: att.id,
                                                name: displayName,
                                                code: att.employeeCode || matchedReg?.employeeCode || "",
                                                score: `${att.score} / ${att.totalQuestions} (${att.percentage}%)`,
                                              })
                                            }
                                            title="Delete Assessment Record"
                                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 transition-all inline-flex items-center justify-center hover:scale-110 active:scale-95 shadow-2xs"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 uppercase text-[11px] font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="p-3">Emp Code</th>
                                <th className="p-3">Employee Name</th>
                                <th className="p-3">Avg Rating</th>
                                <th className="p-3">Key Learnings</th>
                                <th className="p-3 text-right">Submitted Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                              {sFb.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-6 text-center text-slate-500 dark:text-slate-400 font-medium">
                                    No feedback submitted in this session folder yet.
                                  </td>
                                </tr>
                              ) : (
                                sFb.map((fb) => {
                                  const rVals = Object.values(fb.ratings || {}) as number[];
                                  const avg = rVals.length > 0
                                    ? (rVals.reduce((a: number, b: number) => a + Number(b), 0) / rVals.length).toFixed(1)
                                    : "0.0";

                                  return (
                                    <tr key={fb.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                      <td className="p-3 font-bold text-slate-900 dark:text-amber-400 text-xs font-mono">{fb.employeeCode}</td>
                                      <td className="p-3 font-bold text-slate-900 dark:text-white text-xs">{fb.employeeName}</td>
                                      <td className="p-3 font-bold text-slate-900 dark:text-amber-300 flex items-center gap-1 text-xs">
                                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {avg} / 5
                                      </td>
                                      <td className="p-3 text-slate-900 dark:text-slate-200 font-medium text-xs max-w-xs truncate">
                                        {fb.learnings?.filter(Boolean).join(" | ")}
                                      </td>
                                      <td className="p-3 text-right text-slate-800 dark:text-slate-200 font-medium text-xs">
                                        {new Date(fb.submittedAt).toLocaleDateString()}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <>
          {/* Filter Controls Bar */}
          <GlassCard className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 mb-1">
                  Filter by Training Module
                </label>
                <select
                  value={selectedTrainingId}
                  onChange={(e) => setSelectedTrainingId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Training Sessions ({trainings.length})</option>
                  {trainings.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 mb-1">
                  Filter by Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Departments</option>
                  <option value="Assembly & Core Stacking">Assembly & Core Stacking</option>
                  <option value="Winding & Insulation">Winding & Insulation</option>
                  <option value="Testing & Quality Assurance">Testing & Quality Assurance</option>
                  <option value="Maintenance & Plant Electrical">Maintenance & Plant Electrical</option>
                  <option value="Safety & EHS">Safety & EHS</option>
                  <option value="Design & R&D">Design & R&D</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 mb-1">
                  Search Employee Name or Code
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search e.g. UB-1042 or Rajesh"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Tab Buttons */}
            <div className="flex flex-wrap border-t border-slate-200 dark:border-slate-800 pt-3 gap-2">
              <button
                onClick={() => setActiveTab("registrations")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "registrations"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700/60 shadow-2xs"
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Employee Registrations Log ({filteredRegistrations.length})
              </button>
              <button
                onClick={() => setActiveTab("quiz")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "quiz"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700/60 shadow-2xs"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Quiz Results Log ({attempts.length})
              </button>
              <button
                onClick={() => setActiveTab("feedback")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "feedback"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700/60 shadow-2xs"
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Feedback Ratings Log ({feedbacks.length})
              </button>
            </div>
          </GlassCard>

          {/* Main Table Content */}
          <GlassCard className="p-6">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
                Loading reports database...
              </div>
            ) : activeTab === "registrations" ? (
              /* REGISTRATIONS TABLE */
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 uppercase text-[11px] font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Emp Code</th>
                      <th className="p-3">Employee Name</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Designation</th>
                      <th className="p-3">Training Title</th>
                      <th className="p-3">Registered At</th>
                      <th className="p-3 text-right">Quiz Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-500 dark:text-slate-400 font-medium">
                          No registrations match current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map((reg) => {
                        const att = attempts.find((a) => a.registrationId === reg.id);
                        return (
                          <tr key={reg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                            <td className="p-3 font-bold text-slate-900 dark:text-amber-400 text-xs font-mono">{reg.employeeCode}</td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white text-xs">{reg.employeeName}</td>
                            <td className="p-3 text-slate-800 dark:text-sky-200 font-semibold text-xs">{reg.department}</td>
                            <td className="p-3 text-slate-700 dark:text-cyan-300 font-medium text-xs">{reg.designation}</td>
                            <td className="p-3 text-slate-900 dark:text-slate-100 font-semibold text-xs">{reg.trainingTitle}</td>
                            <td className="p-3 text-slate-800 dark:text-slate-100 font-medium text-xs">
                              {new Date(reg.registeredAt).toLocaleString()}
                            </td>
                            <td className="p-3 text-right">
                              {att ? (
                                att.passed ? (
                                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/40 shadow-2xs">
                                    PASSED ({att.percentage}%)
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/40 shadow-2xs">
                                    FAILED ({att.percentage}%)
                                  </span>
                                )
                              ) : (
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 inline-block tracking-wide shadow-2xs">
                                  PENDING QUIZ
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeTab === "quiz" ? (
              /* QUIZ ATTEMPTS TABLE */
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 uppercase text-[11px] font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Emp Code</th>
                      <th className="p-3">Employee Name</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Score</th>
                      <th className="p-3">Percentage</th>
                      <th className="p-3">Time Taken</th>
                      <th className="p-3">Tab Switches</th>
                      <th className="p-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {attempts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-500 dark:text-slate-400 font-medium">
                          No quiz attempts recorded yet.
                        </td>
                      </tr>
                    ) : (
                      attempts.map((att) => {
                        const matchedReg = registrations.find(
                          (r) => r.id === att.registrationId || (att.employeeCode && r.employeeCode === att.employeeCode)
                        );
                        const displayName = att.employeeName?.trim() || matchedReg?.employeeName?.trim() || "Candidate";
                        const initials = displayName
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase();

                        return (
                          <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                            <td className="p-3 font-bold text-slate-900 dark:text-amber-400 text-xs font-mono">{att.employeeCode || matchedReg?.employeeCode || "N/A"}</td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-xs">
                                  {initials}
                                </span>
                                <span>{displayName}</span>
                              </div>
                            </td>
                            <td className="p-3 text-slate-800 dark:text-sky-200 font-semibold text-xs">{att.department || matchedReg?.department || "General"}</td>
                            <td className="p-3 font-bold text-slate-900 dark:text-slate-100 text-xs">
                              {att.score} / {att.totalQuestions}
                            </td>
                            <td className="p-3 font-bold text-slate-900 dark:text-amber-300 text-xs">{att.percentage}%</td>
                            <td className="p-3 text-slate-800 dark:text-slate-200 font-medium text-xs">{att.attemptTimeSeconds || 0}s</td>
                            <td className="p-3">
                              {att.tabSwitches > 0 ? (
                                <span className="text-rose-600 dark:text-rose-400 font-bold">{att.tabSwitches} Warning</span>
                              ) : (
                                <span className="text-slate-700 dark:text-slate-300 font-medium">0</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {att.passed ? (
                                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/40 shadow-2xs">
                                    PASSED
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/40 shadow-2xs">
                                    FAILED
                                  </span>
                                )}
                                <a
                                  href={`/employee/certificate/${att.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-300 text-[10px] font-bold rounded-lg border border-amber-300 dark:border-amber-500/40 transition-all flex items-center gap-1 shadow-2xs"
                                  title="View Detailed Question & Answer Analysis"
                                >
                                  <FileText className="w-3 h-3" /> View Answers
                                </a>
                                <button
                                  onClick={() =>
                                    setDeleteAttemptTarget({
                                      id: att.id,
                                      name: displayName,
                                      code: att.employeeCode || matchedReg?.employeeCode || "",
                                      score: `${att.score} / ${att.totalQuestions} (${att.percentage}%)`,
                                    })
                                  }
                                  title="Delete Assessment Record"
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 transition-all inline-flex items-center justify-center hover:scale-110 active:scale-95 shadow-2xs"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* FEEDBACK RATINGS TABLE */
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 uppercase text-[11px] font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Emp Code</th>
                      <th className="p-3">Employee Name</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Avg Rating</th>
                      <th className="p-3">Top Learnings</th>
                      <th className="p-3 text-right">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {feedbacks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500 dark:text-slate-400 font-medium">
                          No feedbacks submitted yet.
                        </td>
                      </tr>
                    ) : (
                      feedbacks.map((fb) => {
                        const ratingVals = Object.values(fb.ratings || {}) as number[];
                        const avg = ratingVals.length > 0
                          ? (ratingVals.reduce((a: number, b: number) => a + Number(b), 0) / ratingVals.length).toFixed(1)
                          : "0.0";

                        return (
                          <tr key={fb.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                            <td className="p-3 font-bold text-slate-900 dark:text-amber-400 text-xs font-mono">{fb.employeeCode}</td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white text-xs">{fb.employeeName}</td>
                            <td className="p-3 text-slate-800 dark:text-sky-200 font-semibold text-xs">{fb.department}</td>
                            <td className="p-3 font-bold text-slate-900 dark:text-amber-300 flex items-center gap-1 text-xs">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {avg} / 5
                            </td>
                            <td className="p-3 text-slate-900 dark:text-slate-200 font-medium text-xs max-w-xs truncate">
                              {fb.learnings?.filter(Boolean).join(" | ")}
                            </td>
                            <td className="p-3 text-right text-slate-800 dark:text-slate-200 font-medium text-xs">
                              {new Date(fb.submittedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </>
      )}

      {/* Delete Assessment Attempt Modal */}
      {deleteAttemptTarget && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Assessment Record?</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Are you sure you want to permanently delete the quiz assessment for{" "}
                <strong className="text-slate-900 dark:text-white">{deleteAttemptTarget.name}</strong>{" "}
                ({deleteAttemptTarget.code}) with score{" "}
                <span className="font-semibold text-rose-600 dark:text-rose-400">{deleteAttemptTarget.score}</span>?
              </p>
              <p className="text-[11px] text-slate-700 dark:text-slate-400 mt-2 bg-slate-100 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-left">
                • This record will be permanently deleted from Firestore.<br />
                • Pass rates and reports will recalculate automatically.<br />
                • The employee can retake the test if needed.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={deletingAttempt}
                onClick={() => setDeleteAttemptTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAttempt}
                onClick={confirmDeleteAttempt}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deletingAttempt ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Yes, Delete
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
