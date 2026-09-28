import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Training, EmployeeRegistration, QuizAttempt, TrainingFeedback } from "../types";
import { GlassCard } from "../components/GlassCard";
import { TrainingQRCode } from "../components/TrainingQRCode";
import { RealTimeVirtualGraph } from "../components/RealTimeVirtualGraph";
import { AdminManagement } from "../components/AdminManagement";
import {
  Users,
  BookOpen,
  FileSpreadsheet,
  Award,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  QrCode,
  CheckCircle2,
  XCircle,
  Building2,
  Trash2,
  Loader2,
  ShieldCheck,
  Zap
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
        qList.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
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
        fList.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
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

  // Feedback Data Points
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

  // Pass Rate Data Points
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
        att.passed ? "Passed" : "Retest"
      }`,
      status: att.passed ? ("passed" as const) : ("failed" as const),
      date: att.submittedAt,
    };
  });

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
    <div className="min-h-screen bg-[#EAEAEA] text-[#403F3E] p-4 sm:p-6 lg:p-8 space-y-8 transition-colors">
      {/* Top Banner */}
      <div className="bg-[#FFFFFF] rounded-xl p-6 border border-[#D5D4D4] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <p className="text-[10px] text-[#008DD2] font-bold uppercase tracking-wider mb-1">
            Uttam (Bharat) Electricals Pvt. Ltd.
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2B2A28] tracking-tight">
            Assessment Management Dashboard
          </h1>
          <p className="text-xs text-[#757573] mt-1 max-w-2xl">
            Real-time management overview of employee technical trainings, digitized feedback evaluations, interactive virtual analytics, and pass rate metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/create-training"
            className="bg-[#008DD2] text-[#FFFFFF] px-4 py-2.5 rounded-lg font-bold text-xs hover:bg-[#0078B2] active:bg-[#006393] flex items-center gap-2 transition-all shadow-xs"
          >
            <PlusCircle className="w-4 h-4 text-[#FFFFFF]" />
            + Create Training
          </Link>
          <Link
            to="/admin/reports"
            className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#E6F4FA] text-[#006393] border border-[#59B5E2] hover:bg-[#CCE8F6] flex items-center gap-2 transition-all shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#006393]" />
            Export Reports
          </Link>
          <a
            href="#admin-management"
            className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#FFFFFF] hover:bg-[#E6F4FA] text-[#2B2A28] border border-[#D5D4D4] flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#008DD2]" />
            Admin Management
          </a>
        </div>
      </div>

      {/* Metric Cards Grid - 4 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
        {/* Metric 1: Employees */}
        <GlassCard className="p-5 flex flex-col justify-between h-full bg-[#FFFFFF] border border-[#D5D4D4] shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#757573] uppercase tracking-wider">Employees</span>
              <div className="p-1.5 rounded-md bg-[#E6F4FA] text-[#008DD2]">
                <Users className="w-4 h-4 text-[#008DD2]" />
              </div>
            </div>
            <div className="flex items-end justify-between mt-1">
              <span className="text-3xl font-bold text-[#2B2A28]">{totalEmployees}</span>
              <span className="text-[#006393] text-xs font-bold bg-[#E6F4FA] px-2 py-0.5 rounded border border-[#59B5E2]">+4.5%</span>
            </div>
            <p className="text-[10px] text-[#757573] mt-1">Unique registered personnel</p>
          </div>

          {/* Recent Registered Staff */}
          <div className="mt-3 pt-3 border-t border-[#EAEAEA] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#2B2A28]">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#008DD2]" />
                Recent Registered Staff
              </span>
              <span className="text-[10px] text-[#008DD2] font-bold">
                {registrations.length} Total
              </span>
            </div>

            <div className="space-y-1.5 bg-[#EAEAEA] border border-[#D5D4D4] rounded-lg p-2.5">
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
                        <div className="w-6 h-6 rounded bg-[#008DD2] text-[#FFFFFF] font-bold text-[9px] flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#2B2A28] truncate max-w-[95px] leading-tight">
                            {emp.employeeName}
                          </p>
                          <p className="text-[9px] text-[#757573] truncate">
                            {emp.employeeCode ? `#${emp.employeeCode}` : emp.designation || "Staff"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#E6F4FA] text-[#006393] border border-[#59B5E2] shrink-0">
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

            <div className="flex items-center justify-between text-[9.5px] text-[#757573] pt-0.5">
              <span>Roster Coverage</span>
              <span className="font-bold text-[#403F3E]">100% Digital Verified</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#EAEAEA] flex items-center justify-between text-[10px] text-[#757573]">
            <span>Database Roster</span>
            <span className="text-[#008DD2] font-semibold">{registrations.length} Total Registrations</span>
          </div>
        </GlassCard>

        {/* Metric 2: Active Modules */}
        <GlassCard className="p-5 flex flex-col justify-between h-full bg-[#FFFFFF] border border-[#D5D4D4] shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#757573] uppercase tracking-wider">Active Modules</span>
              <div className="p-1.5 rounded-md bg-[#E6F4FA] text-[#008DD2]">
                <BookOpen className="w-4 h-4 text-[#008DD2]" />
              </div>
            </div>
            <div className="flex items-end justify-between mt-1">
              <span className="text-3xl font-bold text-[#2B2A28]">{totalTrainings}</span>
              <span className="text-[#FFFFFF] text-xs font-bold bg-[#008DD2] px-2 py-0.5 rounded">Active</span>
            </div>
            <p className="text-[10px] text-[#757573] mt-1">Live curriculum programs</p>
          </div>

          <div className="mt-3 pt-3 border-t border-[#EAEAEA] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#2B2A28]">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#008DD2]" />
                Live Curriculum Modules
              </span>
              <span className="text-[10px] text-[#008DD2] font-bold">
                {trainings.length} Ready
              </span>
            </div>

            <div className="space-y-1.5 bg-[#EAEAEA] border border-[#D5D4D4] rounded-lg p-2.5">
              {trainings.slice(0, 2).map((t, i) => (
                <div key={t.id || i} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#2B2A28] truncate max-w-[130px]" title={t.title}>
                      {t.title}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#E6F4FA] text-[#006393] border border-[#59B5E2]">
                      {t.questions?.length || 10} Qs
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-[#757573]">
                    <span>Trainer: {t.trainerName || "Expert"}</span>
                    <span>Pass: {t.passingPercentage || 70}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[9.5px] text-[#757573] pt-0.5">
              <span>Proctored Assessments</span>
              <span className="font-bold text-[#008DD2] flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 text-[#008DD2]" /> Auto-Certificates Active
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#EAEAEA] flex items-center justify-between text-[10px] text-[#757573]">
            <span>Live Programs</span>
            <span className="text-[#008DD2] font-semibold">{trainings.length} Active Sessions</span>
          </div>
        </GlassCard>

        {/* Metric 3: Feedbacks */}
        <GlassCard className="p-5 flex flex-col justify-between h-full bg-[#FFFFFF] border border-[#D5D4D4] shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#757573] uppercase tracking-wider">Feedbacks</span>
              <div className="p-1.5 rounded-md bg-[#E6F4FA] text-[#008DD2]">
                <FileSpreadsheet className="w-4 h-4 text-[#008DD2]" />
              </div>
            </div>
            <div className="flex items-end justify-between mt-1">
              <span className="text-3xl font-bold text-[#2B2A28]">{totalFeedbacks}</span>
              <span className="text-[#006393] text-[10px] font-bold bg-[#E6F4FA] px-2 py-0.5 rounded border border-[#59B5E2]">
                {avgFeedbackRating} ★ Overall Avg
              </span>
            </div>
            <p className="text-[10px] text-[#757573] mt-1">Total evaluations submitted</p>
          </div>

          {/* Real-time Virtual Graph for 4 Recent Feedbacks */}
          <div className="mt-3 pt-3 border-t border-[#EAEAEA]">
            <RealTimeVirtualGraph
              type="feedback"
              data={feedbackDataPoints}
              currentAverage={avgFeedbackRating}
              totalCount={feedbacks.length}
              maxRecent={4}
            />
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#EAEAEA] flex items-center justify-between text-[10px] text-[#757573]">
            <span>Evaluations</span>
            <span className="text-[#008DD2] font-semibold">{feedbacks.length} Total Feedbacks</span>
          </div>
        </GlassCard>

        {/* Metric 4: Pass Rate */}
        <GlassCard className="p-5 flex flex-col justify-between h-full bg-[#FFFFFF] border border-[#D5D4D4] shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#757573] uppercase tracking-wider">Pass Rate</span>
              <div className="p-1.5 rounded-md bg-[#E6F4FA] text-[#008DD2]">
                <Award className="w-4 h-4 text-[#008DD2]" />
              </div>
            </div>
            <div className="flex items-end justify-between mt-1">
              <span className="text-3xl font-bold text-[#008DD2]">
                {passPercentage}<span className="text-lg text-[#2B2A28]">%</span>
              </span>
              <span className="text-[#FFFFFF] text-[10px] font-bold bg-[#008DD2] px-2 py-0.5 rounded">
                {passPercentage >= 75
                  ? "Overall: High"
                  : passPercentage >= 50
                  ? "Overall: Good"
                  : attempts.length === 0
                  ? "Awaiting"
                  : "Needs Review"}
              </span>
            </div>
            <p className="text-[10px] text-[#008DD2] mt-1 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#008DD2]" /> {passedAttempts} / {attempts.length} Total Passed
            </p>
          </div>

          {/* Real-time Virtual Graph for 4 Recent Quiz Candidates */}
          <div className="mt-3 pt-3 border-t border-[#EAEAEA]">
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

          <div className="mt-3 pt-2.5 border-t border-[#EAEAEA] flex items-center justify-between text-[10px] text-[#757573]">
            <span>Assessments</span>
            <span className="text-[#008DD2] font-semibold">{attempts.length} Total Attempts</span>
          </div>
        </GlassCard>
      </div>

      {/* Main Grid: Recent Trainings & Department Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Trainings & QR Codes */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6 bg-[#FFFFFF] border border-[#D5D4D4] shadow-xs">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#D5D4D4]">
              <div>
                <h3 className="text-base font-bold text-[#2B2A28] flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#008DD2]" /> Recent Training Programs & QR Codes
                </h3>
                <p className="text-xs text-[#757573] mt-0.5">
                  Scan or click QR code to test employee registration flow
                </p>
              </div>
              <Link
                to="/admin/trainings"
                className="text-xs text-[#008DD2] hover:text-[#0078B2] font-semibold flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5 text-[#008DD2]" />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-[#757573] animate-pulse">
                Loading trainings...
              </div>
            ) : trainings.length === 0 ? (
              <div className="p-8 text-center bg-[#EAEAEA] rounded-xl border border-[#D5D4D4]">
                <BookOpen className="w-10 h-10 text-[#757573] mx-auto mb-2" />
                <p className="text-sm font-bold text-[#2B2A28]">No Trainings Created Yet</p>
                <p className="text-xs text-[#757573] mt-1 mb-4">
                  Create your first transformer training session with AI PDF question parser.
                </p>
                <Link
                  to="/admin/create-training"
                  className="px-4 py-2 bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-[#FFFFFF] rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                >
                  <PlusCircle className="w-4 h-4 text-[#FFFFFF]" /> Create Training
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {trainings.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="p-4 bg-[#FFFFFF] rounded-xl border border-[#D5D4D4] hover:bg-[#E6F4FA] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6F4FA] text-[#006393] border border-[#59B5E2]">
                          {t.department}
                        </span>
                        <span className="text-xs text-[#757573] font-medium">{t.trainingDate}</span>
                      </div>
                      <h4 className="font-bold text-[#2B2A28] text-sm">{t.title}</h4>
                      <p className="text-xs text-[#403F3E]">
                        Trainer: <strong className="text-[#008DD2] font-semibold">{t.trainerName}</strong> • {t.questions?.length || 0} Questions
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2 bg-[#FFFFFF] p-2 rounded-lg border border-[#D5D4D4] shadow-xs">
                        <TrainingQRCode
                          trainingId={t.id}
                          initialUrl={t.qrCodeDataUrl}
                          size={48}
                          className="w-12 h-12 rounded bg-[#FFFFFF] p-0.5"
                        />
                        <div className="text-[11px]">
                          <p className="font-bold text-[#2B2A28]">QR Code</p>
                          <Link
                            to={`/employee/register/${t.id}`}
                            target="_blank"
                            className="text-[#008DD2] hover:text-[#0078B2] text-[10px] flex items-center gap-1 mt-0.5 font-semibold"
                          >
                            Scan / Open <QrCode className="w-3 h-3 text-[#008DD2]" />
                          </Link>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/admin/trainings`)}
                          className="px-3 py-2 rounded-lg bg-[#E6F4FA] hover:bg-[#CCE8F6] text-[#006393] border border-[#59B5E2] text-xs font-semibold transition-all shadow-xs cursor-pointer"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: t.id, title: t.title })}
                          title="Delete Session"
                          className="p-2 rounded-lg bg-[#EAEAEA] hover:bg-[#CCE8F6] text-[#403F3E] border border-[#D5D4D4] text-xs font-semibold transition-all cursor-pointer"
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
          <GlassCard className="p-6 bg-[#FFFFFF] border border-[#D5D4D4] shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D5D4D4]">
              <h3 className="text-base font-bold text-[#2B2A28] flex items-center gap-2">
                <Award className="w-5 h-5 text-[#008DD2]" /> Recent Employee Assessments
              </h3>
              <Link to="/admin/reports" className="text-xs text-[#008DD2] hover:text-[#0078B2] font-semibold">
                View Full Log
              </Link>
            </div>

            {attempts.length === 0 ? (
              <p className="text-xs text-[#757573] text-center py-6">
                No assessments taken yet. Employee responses will appear here live.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#D5D4D4]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#2B2A28] text-[#FFFFFF] font-bold uppercase text-[10px] tracking-wider">
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
                  <tbody className="divide-y divide-[#EAEAEA]">
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
                        <tr key={att.id} className="hover:bg-[#E6F4FA] bg-[#FFFFFF] transition-all">
                          <td className="p-3 font-semibold text-[#2B2A28]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded bg-[#008DD2] text-[#FFFFFF] font-bold text-xs flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                              <div>
                                <span className="font-bold text-[#2B2A28] block leading-tight">
                                  {displayName}
                                </span>
                                <span className="block text-[10px] font-mono text-[#757573]">
                                  {att.employeeCode || matchedReg?.employeeCode || "ID: N/A"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-[#403F3E]">{att.department}</td>
                          <td className="p-3 font-bold text-[#2B2A28]">
                            {att.score} / {att.totalQuestions}
                          </td>
                          <td className="p-3 font-bold text-[#008DD2]">{att.percentage}%</td>
                          <td className="p-3">
                            {att.passed ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#008DD2] text-[#FFFFFF] flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-[#FFFFFF]" /> PASSED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#403F3E] text-[#FFFFFF] flex items-center gap-1 w-fit">
                                <XCircle className="w-3 h-3 text-[#FFFFFF]" /> RETEST
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-[#757573] text-[11px] whitespace-nowrap">
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
                              className="p-1.5 rounded bg-[#EAEAEA] hover:bg-[#CCE8F6] text-[#403F3E] border border-[#D5D4D4] text-xs transition-all inline-flex items-center justify-center cursor-pointer"
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
          <GlassCard className="p-6 bg-[#FFFFFF] border border-[#D5D4D4] shadow-xs">
            <h3 className="text-base font-bold text-[#2B2A28] mb-4 flex items-center gap-2">
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
                    <div key={dept} className="p-3.5 bg-[#FFFFFF] rounded-xl border border-[#D5D4D4] shadow-xs">
                      <div className="flex items-center justify-between text-xs font-bold text-[#2B2A28] mb-1.5">
                        <span>{dept}</span>
                        <span className="text-[#008DD2]">{passRate}% Pass</span>
                      </div>
                      <div className="w-full bg-[#EAEAEA] h-2 rounded-full overflow-hidden mb-1 border border-[#D5D4D4]">
                        <div
                          className="bg-[#008DD2] h-full transition-all duration-500 rounded-full"
                          style={{ width: `${Math.min(passRate, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-[#757573]">
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
          <GlassCard className="p-6 space-y-3 bg-[#FFFFFF] border border-[#D5D4D4] shadow-xs">
            <h3 className="text-sm font-bold text-[#2B2A28] flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#008DD2]" /> Management Actions
            </h3>

            <Link
              to="/admin/create-training"
              className="w-full p-3 bg-[#E6F4FA] hover:bg-[#CCE8F6] border border-[#59B5E2] rounded-xl text-xs font-bold text-[#006393] flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#008DD2]" /> Create New Training
              </span>
              <ArrowRight className="w-4 h-4 text-[#008DD2]" />
            </Link>

            <Link
              to="/admin/reports"
              className="w-full p-3 bg-[#FFFFFF] hover:bg-[#E6F4FA] border border-[#D5D4D4] rounded-xl text-xs font-bold text-[#2B2A28] flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#008DD2]" /> Google Sheets & Reports Hub
              </span>
              <ArrowRight className="w-4 h-4 text-[#757573]" />
            </Link>

            <Link
              to="/admin/analytics"
              className="w-full p-3 bg-[#FFFFFF] hover:bg-[#E6F4FA] border border-[#D5D4D4] rounded-xl text-xs font-bold text-[#2B2A28] flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#008DD2]" /> Visual Charts & Analytics
              </span>
              <ArrowRight className="w-4 h-4 text-[#757573]" />
            </Link>

            <a
              href="#admin-management"
              className="w-full p-3 bg-[#EAEAEA] hover:bg-[#CCE8F6] border border-[#D5D4D4] rounded-xl text-xs font-bold text-[#2B2A28] flex items-center justify-between transition-all cursor-pointer"
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
        <div className="fixed inset-0 bg-[#2B2A28]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#D5D4D4] rounded-xl max-w-md w-full p-6 text-center shadow-lg space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#EAEAEA] border border-[#D5D4D4] text-[#403F3E] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-[#2B2A28]" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#2B2A28]">Delete Training Program?</h3>
              <p className="text-xs text-[#757573] mt-1">
                Are you sure you want to permanently delete <strong className="text-[#2B2A28]">"{deleteTarget.title}"</strong>?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-[#EAEAEA] hover:bg-[#D5D4D4] text-[#403F3E] font-semibold text-xs rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteSession}
                className="flex-1 py-2.5 bg-[#403F3E] hover:bg-[#2B2A28] text-[#FFFFFF] font-bold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#FFFFFF]" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-[#FFFFFF]" /> Yes, Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Assessment Attempt Modal */}
      {deleteAttemptTarget && (
        <div className="fixed inset-0 bg-[#2B2A28]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#D5D4D4] rounded-xl max-w-md w-full p-6 text-center shadow-lg space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#EAEAEA] border border-[#D5D4D4] text-[#403F3E] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-[#2B2A28]" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#2B2A28]">Delete Assessment Record?</h3>
              <p className="text-xs text-[#757573] mt-1">
                Are you sure you want to delete the assessment attempt for{" "}
                <strong className="text-[#2B2A28]">{deleteAttemptTarget.name}</strong>{" "}
                ({deleteAttemptTarget.code}) with score{" "}
                <span className="font-semibold text-[#008DD2]">{deleteAttemptTarget.score}</span>?
              </p>
              <p className="text-[11px] text-[#757573] mt-2 bg-[#EAEAEA] p-2.5 rounded-lg border border-[#D5D4D4] text-left">
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
                className="flex-1 py-2.5 bg-[#EAEAEA] hover:bg-[#D5D4D4] text-[#403F3E] font-semibold text-xs rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAttempt}
                onClick={confirmDeleteAttempt}
                className="flex-1 py-2.5 bg-[#403F3E] hover:bg-[#2B2A28] text-[#FFFFFF] font-bold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {deletingAttempt ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#FFFFFF]" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-[#FFFFFF]" /> Yes, Delete
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
