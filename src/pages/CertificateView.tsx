import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { QuizAttempt, EmployeeRegistration, Training } from "../types";
import { generateCertificatePdf } from "../lib/pdfGenerator";
import { HeaderBranding } from "../components/HeaderBranding";
import { GlassCard } from "../components/GlassCard";
import { CompanyLogo } from "../components/CompanyLogo";
import { backgroundMusic } from "../lib/backgroundMusic";
import { useTheme } from "../context/ThemeContext";
import {
  Award,
  Download,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookOpen,
  Zap,
  Sparkles,
  ShieldCheck,
  FileCheck,
  HelpCircle,
  AlertCircle,
  Loader2
} from "lucide-react";

export const CertificateView: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [registration, setRegistration] = useState<EmployeeRegistration | null>(null);
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "wrong" | "correct">("all");

  useEffect(() => {
    // Stop background music upon entering certificate view
    backgroundMusic.stop();
    if (attemptId) {
      fetchAttemptData();
    }
  }, [attemptId]);

  const fetchAttemptData = async () => {
    try {
      setLoading(true);
      const attSnap = await getDoc(doc(db, "quiz_attempts", attemptId!));
      if (attSnap.exists()) {
        const attData = { id: attSnap.id, ...(attSnap.data() as QuizAttempt) };
        setAttempt(attData);

        const regSnap = await getDoc(doc(db, "registrations", attData.registrationId));
        if (regSnap.exists()) {
          setRegistration({ id: regSnap.id, ...(regSnap.data() as EmployeeRegistration) });
        }

        const trSnap = await getDoc(doc(db, "trainings", attData.trainingId));
        if (trSnap.exists()) {
          setTraining({ id: trSnap.id, ...(trSnap.data() as Training) });
        }
      }
    } catch (err) {
      console.error("Error loading attempt data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (attempt && registration && training) {
      try {
        setDownloading(true);
        await generateCertificatePdf(attempt, registration, training);
      } catch (err) {
        console.error("Failed to generate PDF certificate:", err);
      } finally {
        setDownloading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 gap-3 transition-colors">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400" />
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white text-center">
          Generating Assessment Report & Certificate...
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 text-center max-w-sm">
          Uttam (Bharat) Electricals Pvt. Ltd. • Please wait while your official scores are compiled.
        </p>
      </div>
    );
  }

  if (!attempt || !registration || !training) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 transition-colors">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Assessment attempt record not found
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 text-center max-w-sm">
          The requested certificate or assessment attempt record could not be loaded.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          Go Home
        </button>
      </div>
    );
  }

  const passed = attempt.passed;
  const answeredCount = attempt.userAnswers
    ? Object.keys(attempt.userAnswers).length
    : attempt.correctCount + (attempt.wrongCount || 0);
  const unansweredCount = Math.max(0, attempt.totalQuestions - answeredCount);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors">
      <HeaderBranding subtitle="Official Assessment Result & Certificate Portal" />

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 my-6 space-y-6">
        {passed ? (
          /* PASSED SCREEN & CERTIFICATE GENERATION */
          <GlassCard className="p-6 sm:p-8 space-y-6 border border-emerald-500/40 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Award className="w-8 h-8 animate-bounce" />
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                ASSESSMENT PASSED • {attempt.percentage}% SCORE
              </span>

              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Congratulations, {registration.employeeName}!</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
                You have successfully cleared the technical training assessment for Uttam (Bharat) Electricals Pvt. Ltd. Your Certificate of Completion is ready for download below.
              </p>
            </div>

            {/* Score Breakdown Cards with Unanswered Stat */}
            <div className="grid grid-cols-5 gap-2 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Marks</span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {attempt.score} / {attempt.totalQuestions}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Correct</span>
                <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
                  {attempt.correctCount}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Wrong</span>
                <span className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400">{attempt.wrongCount}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Unanswered</span>
                <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">{unansweredCount}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Percentage</span>
                <span className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400">{attempt.percentage}%</span>
              </div>
            </div>

            {/* Official Uttam Certificate Preview Card */}
            <div className="bg-white dark:bg-slate-950 p-6 sm:p-8 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-xl relative overflow-hidden text-slate-900 dark:text-slate-100 transition-colors">
              {/* Inner Accent Frame - Electric Blue */}
              <div className="border border-sky-500/80 dark:border-sky-400/80 rounded-xl p-4 sm:p-6 relative bg-gradient-to-b from-sky-50/40 via-white to-sky-50/20 dark:from-slate-900/60 dark:via-slate-950 dark:to-slate-900/40">
                {/* 4 Corner Geometric Precision Accents */}
                <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-sky-500 dark:border-sky-400 pointer-events-none" />
                <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-sky-500 dark:border-sky-400 pointer-events-none" />
                <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-sky-500 dark:border-sky-400 pointer-events-none" />
                <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-sky-500 dark:border-sky-400 pointer-events-none" />

                {/* Top Logo & Header */}
                <div className="text-center space-y-1 mb-4">
                  <div className="bg-white dark:bg-slate-900/90 py-2.5 px-6 rounded-xl inline-flex items-center justify-center border border-slate-200 dark:border-slate-700/60 shadow-xs mb-1.5">
                    <CompanyLogo variant="certificate" height={52} darkBg={theme === "dark"} />
                  </div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                    UTTAM (BHARAT) ELECTRICALS PVT. LTD.
                  </h4>
                  <p className="text-[9.5px] uppercase font-bold tracking-wider text-sky-600 dark:text-sky-400">
                    ESTD 1983 • JAIPUR, RAJASTHAN • ISO 9001:2015 CERTIFIED MANUFACTURING FACILITY
                  </p>
                </div>

                {/* Certificate Title Badge */}
                <div className="text-center my-3 relative">
                  <div className="inline-block relative">
                    <span className="text-xs sm:text-sm font-black text-sky-600 dark:text-sky-400 tracking-wider uppercase px-4 py-1 rounded-full bg-sky-100 dark:bg-sky-500/15 border border-sky-300 dark:border-sky-500/40">
                      CERTIFICATE OF TECHNICAL EXCELLENCE
                    </span>
                  </div>
                  <div className="w-24 h-0.5 bg-sky-500/60 mx-auto mt-2 rounded-full" />
                </div>

                {/* Employee Certification Body */}
                <div className="text-center py-2 space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    This is to proudly certify that
                  </p>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-wide uppercase">
                    {registration.employeeName}
                  </h3>
                  <div className="inline-flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span>Code: {registration.employeeCode}</span>
                    <span>•</span>
                    <span>Dept: {registration.department}</span>
                    <span>•</span>
                    <span>Role: {registration.designation}</span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
                    has successfully cleared the technical training assessment and competence evaluation in:
                  </p>
                  <div className="bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-500/30 p-2.5 rounded-xl max-w-xl mx-auto">
                    <p className="text-sm sm:text-base font-black text-sky-900 dark:text-sky-100">
                      {training.title}
                    </p>
                  </div>
                </div>

                {/* Score & Evaluation Details */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-bold text-slate-600 dark:text-slate-400 my-3">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Result: PASSED
                  </span>
                  <span>•</span>
                  <span>Score: {attempt.percentage}% ({attempt.score}/{attempt.totalQuestions})</span>
                  <span>•</span>
                  <span>Training Date: {training.trainingDate}</span>
                </div>

                {/* Signatures & Quality Stamp Row */}
                <div className="grid grid-cols-3 items-end pt-4 mt-2 border-t border-slate-200 dark:border-slate-800/80 gap-2">
                  {/* Left: Trainer */}
                  <div className="text-center">
                    <div className="w-24 sm:w-32 border-b border-slate-400 dark:border-slate-600 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {training.trainerName}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Technical Trainer / Evaluator
                    </p>
                  </div>

                  {/* Center: Official Uttam Quality Stamp */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-sky-500 p-0.5 flex items-center justify-center shadow-xs bg-white dark:bg-slate-900">
                      <div className="w-full h-full rounded-full border border-dashed border-sky-400 flex flex-col items-center justify-center text-center p-1">
                        <Zap className="w-3.5 h-3.5 text-sky-500 fill-sky-500" />
                        <span className="text-[7.5px] font-black text-sky-600 dark:text-sky-400 leading-none mt-0.5">
                          UTTAM
                        </span>
                        <span className="text-[5.5px] font-bold text-slate-600 dark:text-slate-300 leading-none">
                          QUALITY SEAL
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Head - HR */}
                  <div className="text-center">
                    <div className="w-24 sm:w-32 border-b border-slate-400 dark:border-slate-600 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      Head - HR & Training
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      Uttam (Bharat) Electricals
                    </p>
                  </div>
                </div>

                {/* Footer Reference ID */}
                <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/60 gap-1">
                  <span>Verification ID: UB-CERT-{attempt.id.slice(0, 8).toUpperCase()}</span>
                  <span>Official Certificate • Transformers Division</span>
                </div>
              </div>
            </div>

            {/* Download Certificate Action Button */}
            <button
              onClick={handleDownloadCertificate}
              disabled={downloading}
              className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 via-blue-600 to-sky-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed group"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating High-Resolution Certificate PDF...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                  Download Official PDF Certificate
                </>
              )}
            </button>
          </GlassCard>
        ) : (
          /* FAILED SCREEN */
          <GlassCard className="p-6 sm:p-8 space-y-6 border border-rose-500/40 shadow-2xl">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 text-rose-500 mx-auto flex items-center justify-center">
                <XCircle className="w-8 h-8" />
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30">
                BETTER LUCK NEXT TIME • {attempt.percentage}% SCORE
              </span>

              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Assessment Incomplete</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
                You obtained <strong>{attempt.percentage}%</strong> ({attempt.score}/{attempt.totalQuestions}). The required passing threshold for this module is{" "}
                <strong>{training.passingPercentage}%</strong>.
              </p>
            </div>

            {/* Score Breakdown Cards */}
            <div className="grid grid-cols-5 gap-2 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Marks</span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {attempt.score} / {attempt.totalQuestions}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Correct</span>
                <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
                  {attempt.correctCount}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Wrong</span>
                <span className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400">{attempt.wrongCount}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Unanswered</span>
                <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">{unansweredCount}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Required</span>
                <span className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400">
                  {training.passingPercentage}%
                </span>
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Next Steps & Recommendation:
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Please review the training manual and discuss key technical parameters (BDV testing, insulation resistance, core stacking limits) with your department trainer, <strong>{training.trainerName}</strong>.
              </p>
            </div>

            <button
              onClick={() => navigate(`/employee/register/${training.id}`)}
              className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Re-Register & Retry Assessment
            </button>
          </GlassCard>
        )}

        {/* Question & Answer Analysis Section */}
        {training.questions && training.questions.length > 0 && (
          <GlassCard className="p-6 sm:p-8 space-y-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-amber-500" /> Answer Key & Question Review
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Check which questions were wrong, correct, and what option you chose.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setReviewFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    reviewFilter === "all"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  All ({training.questions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter("wrong")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    reviewFilter === "wrong"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" /> Wrong ({attempt.wrongCount})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter("correct")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    reviewFilter === "correct"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Correct ({attempt.correctCount})
                </button>
              </div>
            </div>

            {/* Questions Breakdown */}
            <div className="space-y-4">
              {training.questions.map((q, idx) => {
                const chosenOption =
                  attempt.userAnswers?.[idx] !== undefined
                    ? Number(attempt.userAnswers[idx])
                    : attempt.userAnswers?.[`${idx}`] !== undefined
                    ? Number(attempt.userAnswers[`${idx}`])
                    : undefined;

                const isCorrect = chosenOption !== undefined && chosenOption === q.correctOption;
                const isWrong = chosenOption !== undefined && chosenOption !== q.correctOption;
                const isUnanswered = chosenOption === undefined;

                if (reviewFilter === "wrong" && !isWrong && !isUnanswered) return null;
                if (reviewFilter === "correct" && !isCorrect) return null;

                return (
                  <div
                    key={q.id || idx}
                    className={`p-5 rounded-2xl border transition-all shadow-xs ${
                      isCorrect
                        ? "bg-emerald-50/60 dark:bg-slate-900/60 border-emerald-300 dark:border-emerald-500/30"
                        : "bg-rose-50/60 dark:bg-slate-900/90 border-rose-300 dark:border-rose-500/40"
                    }`}
                  >
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <span
                          className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${
                            isCorrect
                              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40"
                              : "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/40"
                          }`}
                        >
                          Q{idx + 1}
                        </span>
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                          {q.questionText}
                        </p>
                      </div>

                      {/* Status Badge */}
                      {isCorrect ? (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Sahi (Correct)
                        </span>
                      ) : isWrong ? (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 flex items-center gap-1 shrink-0">
                          <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Galat (Incorrect)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 flex items-center gap-1 shrink-0">
                          Choda (Unanswered)
                        </span>
                      )}
                    </div>

                    {/* Options Breakdown */}
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {q.options?.map((optText, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isSelectedByEmployee = chosenOption === optIdx;
                        const isActualCorrectOption = q.correctOption === optIdx;

                        let optionStyle = "bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-400";
                        let badgeText = null;

                        if (isSelectedByEmployee && isActualCorrectOption) {
                          optionStyle =
                            "bg-emerald-100/70 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-semibold ring-1 ring-emerald-500/50";
                          badgeText = (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/50 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Aapka Chuna Answer (Sahi)
                            </span>
                          );
                        } else if (isSelectedByEmployee && !isActualCorrectOption) {
                          optionStyle =
                            "bg-rose-100/70 dark:bg-rose-950/50 border-rose-500 text-rose-950 dark:text-rose-100 font-semibold ring-1 ring-rose-500/50";
                          badgeText = (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-500/30 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/50 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Aapka Chuna Answer (Galat)
                            </span>
                          );
                        } else if (!isSelectedByEmployee && isActualCorrectOption) {
                          optionStyle =
                            "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/60 text-emerald-900 dark:text-emerald-200 font-medium";
                          badgeText = (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Sahi Uttara (Correct Answer)
                            </span>
                          );
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 transition-all ${optionStyle}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="font-bold text-slate-700 dark:text-slate-300 w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] shrink-0">
                                {letter}
                              </span>
                              <span>{optText}</span>
                            </div>
                            {badgeText}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}
      </main>
    </div>
  );
};
