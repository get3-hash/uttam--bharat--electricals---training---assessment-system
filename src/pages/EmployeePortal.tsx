import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Training } from "../types";
import { HeaderBranding } from "../components/HeaderBranding";
import { GlassCard } from "../components/GlassCard";
import { backgroundMusic } from "../lib/backgroundMusic";
import { soundEffects } from "../lib/soundEffects";
import { safeSessionStorage } from "../lib/storage";
import { BackgroundMusicWidget } from "../components/BackgroundMusicWidget";
import {
  User,
  Hash,
  Building2,
  Briefcase,
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Zap,
  BookOpen,
  Music,
  Volume2,
  VolumeX,
  Sparkles,
  Loader2,
  AlertCircle
} from "lucide-react";

const DEPARTMENTS = [
  "Assembly & Core Stacking",
  "Winding & Insulation",
  "Testing & Quality Assurance",
  "Maintenance & Plant Electrical",
  "Safety & EHS",
  "Design & R&D",
  "Dispatch & Logistics"
];

export const EmployeePortal: React.FC = () => {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();

  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields - clean, blank defaults without dummy values
  const [employeeName, setEmployeeName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Background Sound State
  const [soundMuted, setSoundMuted] = useState<boolean>(() => backgroundMusic.getStatus().isMuted);
  const [soundVolume, setSoundVolume] = useState<number>(() => backgroundMusic.getVolume());

  useEffect(() => {
    // Start continuous background sound as soon as employee registration/fill page opens
    backgroundMusic.start("quiz");

    const unsub = backgroundMusic.subscribe((st) => {
      setSoundMuted(st.isMuted);
      setSoundVolume(st.volume);
    });

    if (trainingId) {
      fetchTrainingDetails();
    }

    return () => unsub();
  }, [trainingId]);

  const handleToggleSound = () => {
    const isNowMuted = backgroundMusic.toggleMute();
    setSoundMuted(isNowMuted);
    if (!isNowMuted) {
      backgroundMusic.start("quiz");
    }
  };

  const handleBoostVolume = () => {
    const nextVol = soundVolume < 0.75 ? 0.95 : 0.65;
    backgroundMusic.setVolume(nextVol);
    setSoundVolume(nextVol);
    if (soundMuted) {
      backgroundMusic.setMuted(false);
      setSoundMuted(false);
    }
    backgroundMusic.start("quiz");
  };

  const fetchTrainingDetails = async () => {
    try {
      setLoading(true);
      const snap = await getDoc(doc(db, "trainings", trainingId!));
      if (snap.exists()) {
        setTraining({ id: snap.id, ...(snap.data() as Training) });
      } else {
        alert("Training session not found.");
      }
    } catch (err) {
      console.error("Error fetching training details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEffects.playNavigate();
    if (!training) return;

    const finalDept = department.trim();
    if (!finalDept) {
      alert("Please enter a department.");
      return;
    }

    setSubmitting(true);
    try {
      const regDoc = await addDoc(collection(db, "registrations"), {
        trainingId: training.id,
        employeeName: employeeName.trim(),
        employeeCode: employeeCode.trim(),
        department: finalDept,
        designation: designation.trim(),
        email: email.trim(),
        phone: phone.trim(),
        trainingTitle: training.title,
        trainerName: training.trainerName,
        trainingDate: training.trainingDate,
        registeredAt: new Date().toISOString()
      });

      // Save registration ID in safe session storage for continuity
      safeSessionStorage.setItem("active_registration_id", regDoc.id);
      safeSessionStorage.setItem("active_employee_code", employeeCode);
      safeSessionStorage.setItem("active_employee_name", employeeName);

      // Route to Step 6: Feedback Form
      navigate(`/employee/feedback/${regDoc.id}`);
    } catch (err: any) {
      console.error("Error registering employee:", err);
      alert("Failed to submit registration: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 gap-3 transition-colors">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400" />
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white text-center">
          Loading Training Registration...
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
          Uttam (Bharat) Electricals Pvt. Ltd. • Employee Assessment Portal
        </p>
      </div>
    );
  }

  if (!training) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 transition-colors">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Training session not found
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 text-center max-w-sm">
          This training session is not available or the registration link has expired.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#1E1D1C] text-[#2B2A28] dark:text-[#EAEAEA] flex flex-col justify-between transition-colors">
      <HeaderBranding subtitle="Employee Training Registration Portal (No Login Required)" />

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 my-6">
        <GlassCard className="p-6 sm:p-8 border border-[#D5D4D4] dark:border-[#403F3E] space-y-6 shadow-sm">
          {/* Uttam Branded Active Training Session Card (Section 10 Reference Redesign) */}
          <div className="bg-white dark:bg-[#2B2A28] p-6 rounded-2xl border border-[#D5D4D4] dark:border-[#403F3E] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-[#008DD2] text-white uppercase tracking-wider shadow-xs">
                ACTIVE TRAINING SESSION
              </span>
              <span className="text-xs text-[#008DD2] dark:text-[#59B5E2] font-bold">
                Date: {training.trainingDate}
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#2B2A28] dark:text-white tracking-tight">
              {training.title}
            </h2>
            <div className="flex flex-wrap items-center gap-6 text-xs pt-2 border-t border-[#EAEAEA] dark:border-[#403F3E]">
              <span className="text-[#757573] dark:text-[#B5B4B4]">
                Department: <strong className="text-[#2B2A28] dark:text-white font-bold">{training.department}</strong>
              </span>
              <span className="text-[#757573] dark:text-[#B5B4B4]">
                Trainer: <strong className="text-[#008DD2] dark:text-[#59B5E2] font-bold">{training.trainerName}</strong>
              </span>
            </div>
          </div>

          {/* Continuous Background Music Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#E6F4FA] dark:bg-[#403F3E] rounded-xl border border-[#59B5E2]/40 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#008DD2]/10 text-[#008DD2] dark:text-[#59B5E2] flex items-center justify-center shrink-0 shadow-xs">
                <Music className={`w-4 h-4 ${!soundMuted ? "animate-pulse" : "opacity-60"}`} />
              </div>
              <div>
                <span className="font-bold text-[#006393] dark:text-[#59B5E2] flex items-center gap-1.5 text-xs">
                  Continuous Focus Background Music
                  {!soundMuted && <span className="inline-block w-2 h-2 rounded-full bg-[#008DD2] animate-ping" />}
                </span>
                <span className="text-[#757573] dark:text-[#B5B4B4] text-[11px] block">
                  Plays continuous background audio starting now through all feedback & quiz pages until submission.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBoostVolume}
                className="p-1.5 px-2.5 rounded-lg bg-[#CCE8F6] hover:bg-[#59B5E2]/30 text-[#006393] dark:text-[#E6F4FA] border border-[#59B5E2] flex items-center gap-1 font-bold text-[11px] transition-colors cursor-pointer"
                title="Boost Volume Level"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{Math.round(soundVolume * 100)}% Loud</span>
              </button>
              <button
                type="button"
                onClick={handleToggleSound}
                className="p-1.5 px-2.5 rounded-lg bg-white dark:bg-[#2B2A28] hover:bg-[#EAEAEA] text-[#2B2A28] dark:text-[#EAEAEA] border border-[#D5D4D4] dark:border-[#52514E] flex items-center gap-1 font-semibold text-[11px] transition-colors cursor-pointer"
                title="Mute / Unmute Continuous Sound"
              >
                {soundMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-[#757573]" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-[#008DD2]" />
                )}
                <span>{soundMuted ? "Sound Muted" : "Music Playing"}</span>
              </button>
            </div>
          </div>

          <div className="border-b border-[#D5D4D4] dark:border-[#403F3E] pb-2">
            <h3 className="text-base font-bold text-[#2B2A28] dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-[#008DD2]" /> Employee Registration Details
            </h3>
            <p className="text-xs text-[#757573] dark:text-[#B5B4B4]">
              Enter your official employee details to begin the feedback & assessment module.
            </p>
          </div>

          <form
            onSubmit={handleSubmitRegistration}
            onFocusCapture={() => {
              if (!soundMuted) {
                backgroundMusic.start("quiz");
              }
            }}
            onClick={() => {
              if (!soundMuted) {
                backgroundMusic.start("quiz");
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#403F3E] dark:text-[#D5D4D4] mb-1.5">
                  Full Employee Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#757573] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Enter full name (e.g. Satyapal Yadav)"
                    className="w-full bg-white dark:bg-[#2B2A28] border border-[#D5D4D4] dark:border-[#403F3E] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#2B2A28] dark:text-white focus:outline-none focus:border-[#008DD2] focus:ring-2 focus:ring-[#008DD2]/20 placeholder-[#757573]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#403F3E] dark:text-[#D5D4D4] mb-1.5">
                  Employee Code / ID *
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-[#757573] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="Enter employee code (e.g. UB-6971)"
                    className="w-full bg-white dark:bg-[#2B2A28] border border-[#D5D4D4] dark:border-[#403F3E] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#2B2A28] dark:text-white focus:outline-none focus:border-[#008DD2] focus:ring-2 focus:ring-[#008DD2]/20 placeholder-[#757573]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#403F3E] dark:text-[#D5D4D4] mb-1.5">
                  Department *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#757573] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    list="departments-datalist"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Enter department name (e.g. Testing & QA)"
                    className="w-full bg-white dark:bg-[#2B2A28] border border-[#D5D4D4] dark:border-[#403F3E] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#2B2A28] dark:text-white focus:outline-none focus:border-[#008DD2] focus:ring-2 focus:ring-[#008DD2]/20 placeholder-[#757573]"
                  />
                  <datalist id="departments-datalist">
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#403F3E] dark:text-[#D5D4D4] mb-1.5">
                  Designation *
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-[#757573] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Enter designation (e.g. Senior Quality Engineer)"
                    className="w-full bg-white dark:bg-[#2B2A28] border border-[#D5D4D4] dark:border-[#403F3E] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#2B2A28] dark:text-white focus:outline-none focus:border-[#008DD2] focus:ring-2 focus:ring-[#008DD2]/20 placeholder-[#757573]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#403F3E] dark:text-[#D5D4D4] mb-1.5">
                  Official Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#757573] absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. satyapal@uttambharat.com (optional)"
                    className="w-full bg-white dark:bg-[#2B2A28] border border-[#D5D4D4] dark:border-[#403F3E] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#2B2A28] dark:text-white focus:outline-none focus:border-[#008DD2] focus:ring-2 focus:ring-[#008DD2]/20 placeholder-[#757573]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#403F3E] dark:text-[#D5D4D4] mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#757573] absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210 (optional)"
                    className="w-full bg-white dark:bg-[#2B2A28] border border-[#D5D4D4] dark:border-[#403F3E] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#2B2A28] dark:text-white focus:outline-none focus:border-[#008DD2] focus:ring-2 focus:ring-[#008DD2]/20 placeholder-[#757573]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-white font-extrabold text-sm rounded-xl shadow-md shadow-[#008DD2]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Registering..." : "Continue to Section A: Feedback Form"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </GlassCard>
      </main>

      <BackgroundMusicWidget />
    </div>
  );
};
