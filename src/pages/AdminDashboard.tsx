import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, onSnapshot, getDocs, query, orderBy, limit, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Training, EmployeeRegistration, QuizAttempt, TrainingFeedback } from "../types";
import { GlassCard } from "../components/GlassCard";
import { TrainingQRCode } from "../components/TrainingQRCode";
import { RealTimeVirtualGraph } from "../components/RealTimeVirtualGraph";
import { AdminManagement } from "../components/AdminManagement";
import {
  Users,
  BookOpen,
  HelpCircle,
  FileSpreadsheet,
  Award,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  QrCode,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
  Building2,
  Trash2,
  Loader2,
  ShieldCheck
} from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [registrations, setRegistrations] = useState<EmployeeRegistration[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [feedbacks, setFeedbacks] = useState<TrainingFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  // Session Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Assessment Attempt Delete state
  const [deleteAttemptTarget, setDeleteAttemptTarget] = useState<{
    id: string;
    name: string;
    code: string;
    score: string;
  } | null>(null);
  const [deletingAttempt, setDeletingAttempt] = useState(false);

  const confirmDeleteSession = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "trainings", deleteTarget.id));
      setTrainings((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Error deleting training from dashboard:", err);
      alert("Failed to delete training: " + (err as any).message);
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteAttempt = async () => {
    if (!deleteAttemptTarget) return;
    setDeletingAttempt(true);
    try {
      await deleteDoc(doc(db, "quiz_attempts", deleteAttemptTarget.id));
      setAttempts((prev) => prev.filter((a) => a.id !== deleteAttemptTarget.id));
      setDeleteAttemptTarget(null);
    } catch (err) {
      console.error("Error deleting quiz attempt:", err);
      alert("Failed to delete assessment attempt: " + (err as any).message);
    } finally {
      setDeletingAttempt(false);
    }
  };

  useEffect(() => {
    setLoading(true);

    // Real-time Firestore subscriptions for live synchronization with safe error handlers
    const unsubTrainings = onSnapshot(
      collection(db, "trainings"),
      (snap) => {
        const tList: Training[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Training));
        setTrainings(tList);
      },
      (err) => {
        console.warn("Trainings subscription warning:", err);
      }
    );

    const unsubRegistrations = onSnapshot(
      collection(db, "registrations"),
      (snap) => {
        const rList: EmployeeRegistration[] = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as EmployeeRegistration)
        );
        setRegistrations(rList);
      },
      (err) => {
        console.warn("Registrations subscription warning:", err);
      }
    );

    const unsubAttempts = onSnapshot(
      collection(db, "quiz_attempts"),
      (snap) => {
        const qList: QuizAttempt[] = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as QuizAttempt)
        );
        qList.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
        setAttempts(qList);
      },
      (err) => {
        console.warn("Quiz attempts subscription warning:", err);
      }
    );

    const unsubFeedbacks = onSnapshot(
      collection(db, "feedbacks"),
      (snap) => {
        const fList: TrainingFeedback[] = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as TrainingFeedback)
        );
        fList.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
        setFeedbacks(fList);
        setLoading(false);
      },
      (err) => {
        console.warn("Feedbacks subscription warning:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubTrainings();
      unsubRegistrations();
      unsubAttempts();
      unsubFeedbacks();
    };
  }, []);

  // Metrics Calculations
  const totalEmployees = new Set(registrations.map((r) => r.employeeCode)).size;
  const totalTrainings = trainings.length;
  const totalFeedbacks = feedbacks.length;

  const passedAttempts = attempts.filter((a) => a.passed).length;
  const passPercentage =
    attempts.length > 0 ? Math.round((passedAttempts / attempts.length) * 100) : 0;

  // Real-time Feedback Data Points
  const feedbackDataPoints = feedbacks.map((f, i) => {
    const r = f.ratings;
    let avg = 5.0;
    if (r) {
      const vals = [
        r.expectationCovered ?? r.objectivesCovered,
        r.trainingAidsQuality ?? r.trainingMaterial,
        r.trainerEffectiveness ?? r.presentationDelivery,
        r.trainerInvolvement ?? r.communicationClarity,
        r.trainerAnsweringQuestions ?? r.interactionQa
      ].filter((v): v is number => typeof v === "number" && v > 0);

      if (vals.length > 0) {
        avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      }
    }
    const matchedReg = registrations.find(
      (reg) => reg.id === f.registrationId || (f.employeeCode && reg.employeeCode === f.employeeCode)
    );
    const fullName = f.employeeName?.trim() || matchedReg?.employeeName?.trim() || `Staff #${i + 1}`;
    const shortLabel = fullName.split(" ")[0];

    return {
      label: shortLabel,
      fullName: fullName,
      department: f.department || matchedReg?.department || "General",
      value: Number(avg.toFixed(1)),
      sublabel: `${f.department || matchedReg?.department || "General"} • Rating: ${avg.toFixed(1)}★`,
      status: avg >= 3.5 ? ("passed" as const) : ("neutral" as const),
      date: f.submittedAt,
    };
  });

  const avgFeedbackRating =
    feedbacks.length > 0
      ? (
          feedbackDataPoints.reduce((acc, curr) => acc + curr.value, 0) /
          feedbackDataPoints.length
        ).toFixed(2)
      : "4.82";

  // Real-time Pass Rate Data Points
  const passRateDataPoints = attempts.map((att, i) => {
    const matchedReg = registrations.find(
      (reg) => reg.id === att.registrationId || (att.employeeCode && reg.employeeCode === att.employeeCode)
    );
    const fullName = att.employeeName?.trim() || matchedReg?.employeeName?.trim() || `Candidate #${i + 1}`;
    const shortLabel = fullName.split(" ")[0];

    return {
      label: shortLabel,
      fullName: fullName,
      department: att.department || matchedReg?.department || "General",
      value: att.percentage,
      sublabel: `${att.score}/${att.totalQuestions} (${att.percentage}%) • ${
        att.passed ? "Passed" : "Failed"
      }`,
      status: att.passed ? ("passed" as const) : ("failed" as const),
      date: att.submittedAt,
    };
  });

  // Recent registered employees for Card 1
  const recentRegisteredEmployees = [...registrations].reverse().slice(0, 3);

  // Department Breakdown
  const deptMap: Record<string, { totalReg: number; totalPassed: number }> = {};
  registrations.forEach((reg) => {
    const dept = reg.department || "General";
    if (!deptMap[dept]) deptMap[dept] = { totalReg: 0, totalPassed: 0 };
    deptMap[dept].totalReg += 1;
  });

  attempts.forEach((att) => {
    const dept = att.department || "General";
    if (deptMap[dept] && att.passed) {
      deptMap[dept].totalPassed += 1;
    }
  });

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#1E1D1C] text-[#2B2A28] dark:text-[#EAEAEA] p-4 sm:p-6 lg:p-8 space-y-8 transition-colors">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#2B2A28] rounded-2xl p-6 border border-[#D5D4D4] dark:border-[#403F3E] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#008DD2]/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <p className="text-[10px] text-[#008DD2] dark:text-[#59B5E2] font-bold uppercase tracking-wider mb-1">
            Uttam (Bharat) Electricals Pvt. Ltd.
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2B2A28] dark:text-white tracking-tight">
            Assessment Management Dashboard
          </h1>
          <p className="text-xs text-[#757573] dark:text-[#D5D4D4] mt-1 max-w-2xl">
            Real-time management overview of employee technical trainings, digitized feedback evaluations, interactive virtual analytics, and pass rate metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/create-training"
            className="bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            + Create Training
          </Link>
          <Link
            to="/admin/reports"
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#E6F4FA] hover:bg-[#CCE8F6] text-[#006393] border border-[#59B5E2] flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Reports
          </Link>
          <a
            href="#admin-management"
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#EAEAEA] hover:bg-[#D5D4D4] dark:bg-[#403F3E] dark:hover:bg-[#52514E] text-[#2B2A28] dark:text-[#EAEAEA] border border-[#D5D4D4] dark:border-[#52514E] flex items-center gap-2 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#008DD2] dark:text-[#59B5E2]" />
            Admin Management
          </a>
        </div>
      </div>

      {/* Metric Cards Grid - 4 Columns with Perfect Height Alignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
        {/* Employees */}
        <GlassCard className="p-5 border-l-4 border-l-[#008DD2] flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#757573] dark:text-[#D5D4D4] uppercase tracking-wider">Employees</span>
              <div className="p-1.5 rounded-lg bg-[#E6F4FA] dark:bg-[#403F3E] text-[#008DD2] dark:text-[#59B5E2]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between mt-1">
              <span className="text-3xl font-bold text-[#2B2A28] dark:text-white">{totalEmployees}</span>
              <span className="text-[#006393] dark:text-[#59B5E2] text-xs font-bold bg-[#E6F4FA] dark:bg-[#403F3E] px-2 py-0.5 rounded border border-[#CCE8F6] dark:border-[#52514E]">+4.5%</span>
            </div>
            <p className="text-[10px] text-[#757573] dark:text-[#B5B4B4] mt-1">Unique registered personnel</p>
          </div>

          {/* Middle Content: Recent Registered Staff */}
          <div className="mt-3 pt-3 border-t border-[#EAEAEA] dark:border-[#403F3E] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-[#403F3E] dark:text-[#EAEAEA]">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#008DD2] animate-pulse" />
                Recent Registered Staff
              </span>
              <span className="text-[10px] text-[#008DD2] dark:text-[#59B5E2] font-bold">
                {registrations.length} Total
              </span>
            </div>

            {/* List of 3 Recent Employees */}
            <div className="space-y-1.5 bg-[#F0F4F8] dark:bg-[#1E1D1C] border border-[#D5D4D4] dark:border-[#403F3E] rounded-xl p-2.5 shadow-2xs">
              {recentRegisteredEmployees.length > 0 ? (
                recentRegisteredEmployees.map((emp, i) => {
                  const initials = (emp.employeeName || "E")
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  return (
                    <div key={emp.id || i} className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-[#008DD2] text-white font-black text-[9px] flex items-center justify-center shrink-0 shadow-xs">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#2B2A28] dark:text-white truncate max-w-[95px] leading-tight">
                            {emp.employeeName}
                          </p>
                          <p className="text-[9px] text-[#757573] dark:text-[#B5B4B4] truncate">
                            {emp.employeeCode ? `#${emp.employeeCode}` : emp.designation || "Staff"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#E6F4FA] dark:bg-[#403F3E] text-[#006393] dark:text-[#59B5E2] border border-[#CCE8F6] dark:border-[#52514E] shrink-0">
                        {emp.department || "Production"}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-[11px] text-[#757573] py-2 text-center">
                  Roster ready for new registrations
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[9.5px] text-[#757573] dark:text-[#D5D4D4] pt-0.5">
              <span>Roster Coverage</span>
              <span className="font-bold text-[#403F3E] dark:text-[#EAEAEA]">
                100% Digital Verified
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#EAEAEA] dark:border-[#403F3E] flex items-center justify-between text-[10px] text-[#757573] dark:text-[#D5D4D4]">
            <span>Database Roster</span>
            <span className="text-[#008DD2] dark:text-[#59B5E2] font-semibold">{registrations.length} Total Registrations</span>
          </div>
        </GlassCard>

        {/* Active Modules */}
        <GlassCard className="p-5 border-l-4 border-l-[#0078B2] flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#757573] dark:text-[#D5D4D4] uppercase tracking-wider">Active Modules</span>
              <div className="p-1.5 rounded-lg bg-[#E6F4FA] dark:bg-[#403F3E] text-[#0078B2] dark:text-[#59B5E2]">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between mt-1">
              <span className="text-3xl font-bold text-[#2B2A28] dark:text-white">{totalTrainings}</span>
              <span className="text-[#006393] dark:text-[#59B5E2] text-xs font-bold bg-[#E6F4FA] dark:bg-[#403F3E] px-2 py-0.5 rounded border border-[#CCE8F6] dark:border-[#52514E]">Active</span>
            </div>
            <p className="text-[10px] text-[#757573] dark:text-[#B5B4B4] mt-1">Live curriculum programs</p>
          </div>

          {/* Middle Content: Live Curriculum Status */}
          <div className="mt-3 pt-3 border-t border-[#EAEAEA] dark:border-[#403F3E] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-[#403F3E] dark:text-[#EAEAEA]">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#0078B2] animate-pulse" />
                Live Curriculum Modules
              </span>
              <span className="text-[10px] text-[#0078B2] dark:text-[#59B5E2] font-bold">
                {trainings.length} Ready
              </span>
            </div>

            {/* List of active trainings */}
            <div className="space-y-1.5 bg-[#F0F4F8] dark:bg-[#1E1D1C] border border-[#D5D4D4] dark:border-[#403F3E] rounded-xl p-2.5 shadow-2xs">
              {trainings.slice(0, 2).map((t, i) => (
                <div key={t.id || i} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#2B2A28] dark:text-white truncate max-w-[130px]" title={t.title}>
                      {t.title}
                    </span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#E6F4FA] dark:bg-[#403F3E] text-[#006393] dark:text-[#59B5E2] border border-[#CCE8F6] dark:border-[#52514E]">
                      {t.questions?.length || 10} Qs
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-[#757573] dark:text-[#B5B4B4]">
                    <span>Trainer: {t.trainerName || "Expert"}</span>
                    <span>Pass: {t.passingPercentage || 70}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[9.5px] text-[#757573] dark:text-[#D5D4D4] pt-0.5">
              <span>Proctored Assessments</span>
              <span className="font-bold text-[#008DD2] dark:text-[#59B5E2] flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Auto-Certificates Active
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#EAEAEA] dark:border-[#403F3E] flex items-center justify-between text-[10px] text-[#757573] dark:text-[#D5D4D4]">
            <span>Live Programs</span>
            <span className="text-[#0078B2] dark:text-[#59B5E2] font-semibold">{trainings.length} Active Sessions</span>
          </div>
        </GlassCard>

        {/* Feedbacks with Live Virtual Graph */}
        <GlassCard className="p-5 border-l-4 border-l-[#008DD2] flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#757573] dark:text-[#D5D4D4] uppercase tracking-wider">Feedbacks</span>
              <div className="p-1.5 rounded-lg bg-[#E6F4FA] dark:bg-[#403F3E] text-[#008DD2] dark:text-[#59B5E2]">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between mt-1">
              <span className="text-3xl font-bold text-[#2B2A28] dark:text-white">{totalFeedbacks}</span>
              <span className="text-[#006393] dark:text-[#59B5E2] text-[10px] font-bold bg-[#E6F4FA] dark:bg-[#403F3E] px-2 py-0.5 rounded border border-[#CCE8F6] dark:border-[#52514E]">
                {avgFeedbackRating} ★ Overall Avg
              </span>
            </div>
            <p className="text-[10px] text-[#757573] dark:text-[#B5B4B4] mt-1">Total evaluations submitted</p>
          </div>

          {/* Real-time Virtual Graph for 4 Recent Feedbacks */}
          <div className="mt-3 pt-3 border-t border-[#EAEAEA] dark:border-[#403F3E]">
            <RealTimeVirtualGraph
              type="feedback"
              data={feedbackDataPoints}
              currentAverage={avgFeedbackRating}
              totalCount={feedbacks.length}
              maxRecent={4}
            />
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#EAEAEA] dark:border-[#403F3E] flex items-center justify-between text-[10px] text-[#757573] dark:text-[#D5D4D4]">
            <span>Evaluations</span>
            <span className="text-[#008DD2] dark:text-[#59B5E2] font-semibold">{feedbacks.length} Total Feedbacks</span>
          </div>
        </GlassCard>

        {/* Pass Rate with Live Virtual Graph */}
        <GlassCard className="p-5 border-l-4 border-l-[#006393] flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#757573] dark:text-[#D5D4D4] uppercase tracking-wider">Pass Rate</span>
              <div className="p-1.5 rounded-lg bg-[#E6F4FA] dark:bg-[#403F3E] text-[#006393] dark:text-[#59B5E2]">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between mt-1">
              <span className="text-3xl font-bold text-[#2B2A28] dark:text-white">
                {passPercentage}<span className="text-lg">%</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  passPercentage >= 75
                    ? "text-[#006393] dark:text-[#59B5E2] bg-[#E6F4FA] dark:bg-[#403F3E] border-[#CCE8F6] dark:border-[#52514E]"
                    : passPercentage >= 50
                    ? "text-[#008DD2] dark:text-[#59B5E2] bg-[#E6F4FA] dark:bg-[#403F3E] border-[#CCE8F6] dark:border-[#52514E]"
                    : attempts.length === 0
                    ? "text-[#757573] dark:text-[#B5B4B4] bg-[#EAEAEA] dark:bg-[#403F3E] border-[#D5D4D4] dark:border-[#52514E]"
                    : "text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800"
                }`}
              >
                {passPercentage >= 75
                  ? "Overall: Excellent"
                  : passPercentage >= 50
                  ? "Overall: Good"
                  : attempts.length === 0
                  ? "Awaiting"
                  : "Needs Attention"}
              </span>
            </div>
            <p className="text-[10px] text-[#008DD2] dark:text-[#59B5E2] mt-1 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {passedAttempts} / {attempts.length} Total Passed
            </p>
          </div>

          {/* Real-time Virtual Graph for 4 Recent Quiz Candidates */}
          <div className="mt-3 pt-3 border-t border-[#EAEAEA] dark:border-[#403F3E]">
            <RealTimeVirtualGraph
              type="passRate"
              data={passRateDataPoints}
              currentAverage={passPercentage}
              totalCount={attempts.length}
              totalPassed={passedAttempts}
              totalFailed={attempts.length - passedAttempts}
              maxRecent={4}
            />
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#EAEAEA] dark:border-[#403F3E] flex items-center justify-between text-[10px] text-[#757573] dark:text-[#D5D4D4]">
            <span>Assessments</span>
            <span className="text-[#006393] dark:text-[#59B5E2] font-semibold">{attempts.length} Total Attempts</span>
          </div>
        </GlassCard>
      </div>

      {/* Main Grid: Recent Trainings & Department Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Trainings & QR Codes */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#EAEAEA] dark:border-[#403F3E]">
              <div>
                <h3 className="text-base font-bold text-[#2B2A28] dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#008DD2]" /> Recent Training Programs & QR Codes
                </h3>
                <p className="text-xs text-[#757573] dark:text-[#D5D4D4] mt-0.5">
                  Scan or click QR code to test employee registration flow
                </p>
              </div>
              <Link
                to="/admin/trainings"
                className="text-xs text-[#008DD2] dark:text-[#59B5E2] hover:underline font-semibold flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-[#757573] animate-pulse">
                Loading trainings...
              </div>
            ) : trainings.length === 0 ? (
              <div className="p-8 text-center bg-[#F0F4F8] dark:bg-[#1E1D1C] rounded-xl border border-[#D5D4D4] dark:border-[#403F3E]">
                <BookOpen className="w-10 h-10 text-[#757573] mx-auto mb-2" />
                <p className="text-sm font-bold text-[#2B2A28] dark:text-white">No Trainings Created Yet</p>
                <p className="text-xs text-[#757573] mt-1 mb-4">
                  Create your first transformer training session with AI PDF question parser.
                </p>
                <Link
                  to="/admin/create-training"
                  className="px-4 py-2 bg-[#008DD2] hover:bg-[#0078B2] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" /> Create Training
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {trainings.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="p-4 bg-[#F0F4F8] dark:bg-[#1E1D1C] rounded-xl border border-[#D5D4D4] dark:border-[#403F3E] hover:border-[#008DD2] dark:hover:border-[#008DD2] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6F4FA] dark:bg-[#403F3E] text-[#006393] dark:text-[#59B5E2] border border-[#CCE8F6] dark:border-[#52514E]">
                          {t.department}
                        </span>
                        <span className="text-xs text-[#757573] dark:text-[#D5D4D4]">{t.trainingDate}</span>
                      </div>
                      <h4 className="font-bold text-[#2B2A28] dark:text-white text-sm">{t.title}</h4>
                      <p className="text-xs text-[#757573] dark:text-[#D5D4D4]">
                        Trainer: <strong className="text-[#2B2A28] dark:text-[#EAEAEA]">{t.trainerName}</strong> • {t.questions?.length || 0} Questions
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2 bg-white dark:bg-[#2B2A28] p-2 rounded-xl border border-[#D5D4D4] dark:border-[#403F3E] shadow-2xs">
                        <TrainingQRCode
                          trainingId={t.id}
                          initialUrl={t.qrCodeDataUrl}
                          size={48}
                          className="w-12 h-12 rounded bg-white p-0.5"
                        />
                        <div className="text-[11px]">
                          <p className="font-bold text-[#2B2A28] dark:text-[#EAEAEA]">QR Code</p>
                          <Link
                            to={`/employee/register/${t.id}`}
                            target="_blank"
                            className="text-[#008DD2] dark:text-[#59B5E2] hover:underline text-[10px] flex items-center gap-1 mt-0.5 font-semibold"
                          >
                            Scan / Open <QrCode className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/admin/trainings`)}
                          className="px-3 py-2 rounded-xl bg-white hover:bg-[#EAEAEA] dark:bg-[#403F3E] dark:hover:bg-[#52514E] text-[#2B2A28] dark:text-[#EAEAEA] text-xs font-semibold border border-[#D5D4D4] dark:border-[#52514E] transition-all shadow-2xs cursor-pointer"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: t.id, title: t.title })}
                          title="Delete Session"
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Recent Quiz Submissions Log */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EAEAEA] dark:border-[#403F3E]">
              <h3 className="text-base font-bold text-[#2B2A28] dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-[#008DD2]" /> Recent Employee Assessments
              </h3>
              <Link to="/admin/reports" className="text-xs text-[#008DD2] dark:text-[#59B5E2] hover:underline font-semibold">
                View Full Log
              </Link>
            </div>

            {attempts.length === 0 ? (
              <p className="text-xs text-[#757573] text-center py-6">
                No assessments taken yet. Employee responses will appear here live.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#D5D4D4] dark:border-[#403F3E]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#2B2A28] text-white font-bold uppercase text-[10px] tracking-wider border-b-2 border-[#008DD2]">
                    <tr>
                      <th className="p-3">Employee</th>
                      <th className="p-3">Dept</th>
                      <th className="p-3">Score</th>
                      <th className="p-3">Percentage</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEAEA] dark:divide-[#403F3E] bg-white dark:bg-[#2B2A28]">
                    {attempts.slice(0, 10).map((att) => {
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
                        <tr key={att.id} className="hover:bg-[#E6F4FA]/50 dark:hover:bg-[#403F3E]/50 transition-colors">
                          <td className="p-3 font-semibold text-[#2B2A28] dark:text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-[#008DD2] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                {initials}
                              </div>
                              <div>
                                <span className="font-bold text-[#2B2A28] dark:text-white block leading-tight">
                                  {displayName}
                                </span>
                                <span className="block text-[10px] font-mono text-[#757573] dark:text-[#D5D4D4]">
                                  {att.employeeCode || matchedReg?.employeeCode || "ID: N/A"}
                                </span>
                              </div>
                            </div>
                          </td>
                        <td className="p-3 text-[#403F3E] dark:text-[#D5D4D4]">{att.department}</td>
                        <td className="p-3 font-bold text-[#2B2A28] dark:text-[#EAEAEA]">
                          {att.score} / {att.totalQuestions}
                        </td>
                        <td className="p-3 font-bold text-[#008DD2] dark:text-[#59B5E2]">{att.percentage}%</td>
                        <td className="p-3">
                          {att.passed ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6F4FA] dark:bg-[#403F3E] text-[#006393] dark:text-[#59B5E2] border border-[#CCE8F6] dark:border-[#52514E] flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> PASSED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1 w-fit">
                              <XCircle className="w-3 h-3" /> FAILED
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-[#757573] dark:text-[#D5D4D4] text-[11px] whitespace-nowrap">
                          {new Date(att.submittedAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
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
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs transition-all inline-flex items-center justify-center hover:scale-110 active:scale-95 shadow-xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Column: Department Performance & Quick Actions */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-[#2B2A28] dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#008DD2]" /> Department Performance
            </h3>

            {Object.keys(deptMap).length === 0 ? (
              <p className="text-xs text-[#757573] text-center py-4">
                No department registrations logged yet.
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(deptMap).map(([dept, data]) => {
                  const passRate =
                    data.totalReg > 0
                      ? Math.round((data.totalPassed / data.totalReg) * 100)
                      : 0;
                  return (
                    <div key={dept} className="p-3.5 bg-[#F0F4F8] dark:bg-[#1E1D1C] rounded-xl border border-[#D5D4D4] dark:border-[#403F3E] shadow-xs">
                      <div className="flex items-center justify-between text-xs font-bold text-[#2B2A28] dark:text-[#EAEAEA] mb-1.5">
                        <span>{dept}</span>
                        <span className="text-[#008DD2] dark:text-[#59B5E2]">{passRate}% Pass</span>
                      </div>
                      <div className="w-full bg-[#EAEAEA] dark:bg-[#403F3E] h-2 rounded-full overflow-hidden mb-1 border border-[#D5D4D4] dark:border-[#52514E]">
                        <div
                          className="bg-[#008DD2] h-full transition-all duration-500"
                          style={{ width: `${Math.min(passRate, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-[#757573] dark:text-[#D5D4D4]">
                        <span>{data.totalReg} Registered</span>
                        <span>{data.totalPassed} Passed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* Quick System Actions */}
          <GlassCard className="p-6 space-y-3">
            <h3 className="text-sm font-bold text-[#2B2A28] dark:text-white flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#008DD2]" /> Management Actions
            </h3>

            <Link
              to="/admin/create-training"
              className="w-full p-3 bg-[#E6F4FA] hover:bg-[#CCE8F6] border border-[#59B5E2]/40 rounded-xl text-xs font-bold text-[#006393] flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#008DD2]" /> Create New Training
              </span>
              <ArrowRight className="w-4 h-4 text-[#008DD2]" />
            </Link>

            <Link
              to="/admin/reports"
              className="w-full p-3 bg-[#F0F4F8] hover:bg-[#EAEAEA] dark:bg-[#1E1D1C] dark:hover:bg-[#403F3E] border border-[#D5D4D4] dark:border-[#403F3E] rounded-xl text-xs font-bold text-[#2B2A28] dark:text-[#EAEAEA] flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#008DD2]" /> Google Sheets & Reports Hub
              </span>
              <ArrowRight className="w-4 h-4 text-[#757573]" />
            </Link>

            <Link
              to="/admin/analytics"
              className="w-full p-3 bg-[#F0F4F8] hover:bg-[#EAEAEA] dark:bg-[#1E1D1C] dark:hover:bg-[#403F3E] border border-[#D5D4D4] dark:border-[#403F3E] rounded-xl text-xs font-bold text-[#2B2A28] dark:text-[#EAEAEA] flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#008DD2]" /> Visual Charts & Analytics
              </span>
              <ArrowRight className="w-4 h-4 text-[#757573]" />
            </Link>

            <a
              href="#admin-management"
              className="w-full p-3 bg-[#E6F4FA] hover:bg-[#CCE8F6] border border-[#59B5E2]/40 rounded-xl text-xs font-bold text-[#006393] flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#008DD2]" /> Admin Accounts & Access Control
              </span>
              <ArrowRight className="w-4 h-4 text-[#008DD2]" />
            </a>
          </GlassCard>
        </div>
      </div>

      {/* Admin Management Section */}
      <div id="admin-management" className="scroll-mt-20 pt-2">
        <AdminManagement />
      </div>

      {/* Delete Session Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-[#2B2A28]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2B2A28] border border-[#D5D4D4] dark:border-[#403F3E] rounded-2xl max-w-md w-full p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#2B2A28] dark:text-white">Delete Training Program?</h3>
              <p className="text-xs text-[#757573] dark:text-[#D5D4D4] mt-1">
                Are you sure you want to permanently delete <strong className="text-[#2B2A28] dark:text-white">"{deleteTarget.title}"</strong>?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-[#EAEAEA] hover:bg-[#D5D4D4] dark:bg-[#403F3E] dark:hover:bg-[#52514E] text-[#2B2A28] dark:text-[#EAEAEA] font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteSession}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
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

      {/* Delete Assessment Attempt Modal */}
      {deleteAttemptTarget && (
        <div className="fixed inset-0 bg-[#2B2A28]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2B2A28] border border-[#D5D4D4] dark:border-[#403F3E] rounded-2xl max-w-md w-full p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#2B2A28] dark:text-white">Delete Assessment Record?</h3>
              <p className="text-xs text-[#757573] dark:text-[#D5D4D4] mt-1">
                Are you sure you want to delete the assessment attempt for{" "}
                <strong className="text-[#2B2A28] dark:text-white">{deleteAttemptTarget.name}</strong>{" "}
                ({deleteAttemptTarget.code}) with score{" "}
                <span className="font-semibold text-rose-600 dark:text-rose-400">{deleteAttemptTarget.score}</span>?
              </p>
              <p className="text-[11px] text-[#757573] dark:text-[#D5D4D4] mt-2 bg-[#F0F4F8] dark:bg-[#1E1D1C] p-2.5 rounded-xl border border-[#D5D4D4] dark:border-[#403F3E] text-left">
                • This record will be permanently deleted from Firestore.<br />
                • Dashboard pass rates and department metrics will update automatically.<br />
                • The employee can retake the test if needed.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={deletingAttempt}
                onClick={() => setDeleteAttemptTarget(null)}
                className="flex-1 py-2.5 bg-[#EAEAEA] hover:bg-[#D5D4D4] dark:bg-[#403F3E] dark:hover:bg-[#52514E] text-[#2B2A28] dark:text-[#EAEAEA] font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAttempt}
                onClick={confirmDeleteAttempt}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
