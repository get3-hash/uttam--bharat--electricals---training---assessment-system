import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, collection, addDoc, getDocs, query, where, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { EmployeeRegistration, Training } from "../types";
import { HeaderBranding } from "../components/HeaderBranding";
import { GlassCard } from "../components/GlassCard";
import { backgroundMusic } from "../lib/backgroundMusic";
import { soundEffects } from "../lib/soundEffects";
import { safeSessionStorage } from "../lib/storage";
import { BackgroundMusicWidget } from "../components/BackgroundMusicWidget";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  BookOpen,
  Calendar,
  Sparkles,
  AlertCircle,
  RefreshCw
} from "lucide-react";

export const SectionBActionPlan: React.FC = () => {
  const { registrationId } = useParams<{ registrationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateData = location.state as { registration?: EmployeeRegistration; training?: Training } | null;

  // Hydrate registration and training state instantly from router state or safeSessionStorage
  const [registration, setRegistration] = useState<EmployeeRegistration | null>(() => {
    if (stateData?.registration) return stateData.registration;
    try {
      const stored = safeSessionStorage.getItem("active_registration_data");
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  const [training, setTraining] = useState<Training | null>(() => {
    if (stateData?.training) return stateData.training;
    try {
      const stored = safeSessionStorage.getItem("active_training_data");
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  const [loading, setLoading] = useState<boolean>(!registration || !training);
  const [submitting, setSubmitting] = useState(false);

  // Section - B: Three Interesting Learnings & Timelines
  const [sectionB, setSectionB] = useState({
    a: { learning: "", timeline: "In a Week" },
    b: { learning: "", timeline: "In a Month" },
    c: { learning: "", timeline: "In a Quarter" }
  });

  const timelineOptions = ["In a Week", "In a Month", "In a Quarter", "In a Year"];

  const effectiveRegId =
    registrationId && registrationId !== "undefined" && registrationId !== ":registrationId"
      ? registrationId
      : registration?.id || safeSessionStorage.getItem("active_registration_id") || "";

  useEffect(() => {
    // Keep background ambient focus sound playing
    backgroundMusic.start();
    if (effectiveRegId) {
      safeSessionStorage.setItem("active_registration_id", effectiveRegId);
      fetchData(effectiveRegId);
    } else if (!registration || !training) {
      setLoading(false);
    }
  }, [effectiveRegId]);

  const fetchData = async (targetId: string) => {
    try {
      if (!registration || !training) {
        setLoading(true);
      }
      const regSnap = await getDoc(doc(db, "registrations", targetId));
      if (regSnap.exists()) {
        const regData = { id: regSnap.id, ...(regSnap.data() as EmployeeRegistration) };
        setRegistration(regData);
        safeSessionStorage.setItem("active_registration_id", regData.id);
        safeSessionStorage.setItem("active_registration_data", JSON.stringify(regData));

        const trSnap = await getDoc(doc(db, "trainings", regData.trainingId));
        if (trSnap.exists()) {
          const trData = { id: trSnap.id, ...(trSnap.data() as Training) };
          setTraining(trData);
          safeSessionStorage.setItem("active_training_id", trData.id);
          safeSessionStorage.setItem("active_training_data", JSON.stringify(trData));
        } else if (!training) {
          const synth: Training = {
            id: regData.trainingId || "default-training",
            title: regData.trainingTitle || "Transformer Technical & Safety Training",
            department: regData.department || "Technical",
            trainerName: regData.trainerName || "Technical Lead",
            trainingDate: regData.trainingDate || new Date().toISOString().split("T")[0],
            description: "Technical Training Session",
            passingPercentage: 70,
            timeLimitMinutes: 15,
            questions: [],
            isAnswerKeyComplete: true,
            createdAt: new Date().toISOString(),
            createdBy: "System"
          };
          setTraining(synth);
          safeSessionStorage.setItem("active_training_id", synth.id);
          safeSessionStorage.setItem("active_training_data", JSON.stringify(synth));
        }

        // Prepopulate if feedback already has Section B
        const fbSnap = await getDocs(
          query(collection(db, "feedbacks"), where("registrationId", "==", regData.id))
        );
        if (!fbSnap.empty) {
          const fbData = fbSnap.docs[0].data();
          if (fbData.learningsSectionB) {
            setSectionB(fbData.learningsSectionB);
          } else if (Array.isArray(fbData.learnings)) {
            setSectionB({
              a: { learning: fbData.learnings[0] || "", timeline: "In a Week" },
              b: { learning: fbData.learnings[1] || "", timeline: "In a Month" },
              c: { learning: fbData.learnings[2] || "", timeline: "In a Quarter" }
            });
          }
          safeSessionStorage.setItem("active_feedback_id", fbSnap.docs[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading Section B data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSectionBChange = (
    row: "a" | "b" | "c",
    field: "learning" | "timeline",
    value: string
  ) => {
    if (field === "timeline") {
      soundEffects.playTouchTap();
    }
    setSectionB((prev) => ({
      ...prev,
      [row]: { ...prev[row], [field]: value }
    }));
  };

  const handleSubmitSectionB = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEffects.playNavigate();
    if (!registration || !training) return;

    setSubmitting(true);
    try {
      const fbQuery = query(
        collection(db, "feedbacks"),
        where("registrationId", "==", registration.id)
      );
      const fbSnap = await getDocs(fbQuery);

      const learningsArray = [
        sectionB.a.learning.trim(),
        sectionB.b.learning.trim(),
        sectionB.c.learning.trim()
      ];

      const learningsData = {
        a: { learning: sectionB.a.learning.trim(), timeline: sectionB.a.timeline },
        b: { learning: sectionB.b.learning.trim(), timeline: sectionB.b.timeline },
        c: { learning: sectionB.c.learning.trim(), timeline: sectionB.c.timeline }
      };

      if (!fbSnap.empty) {
        const feedbackDocId = fbSnap.docs[0].id;
        await updateDoc(doc(db, "feedbacks", feedbackDocId), {
          learnings: learningsArray,
          learningsSectionB: learningsData,
          updatedAt: new Date().toISOString()
        });
      } else {
        const fbDoc = await addDoc(collection(db, "feedbacks"), {
          registrationId: registration.id,
          trainingId: training.id,
          employeeCode: registration.employeeCode,
          employeeName: registration.employeeName,
          department: registration.department,
          ratings: {
            expectationCovered: 5,
            trainingAidsQuality: 5,
            trainerEffectiveness: 5,
            trainerInvolvement: 5,
            trainerAnsweringQuestions: 5
          },
          learnings: learningsArray,
          learningsSectionB: learningsData,
          submittedAt: new Date().toISOString()
        });
        safeSessionStorage.setItem("active_feedback_id", fbDoc.id);
      }

      const targetRegId = registration.id || effectiveRegId;
      safeSessionStorage.setItem("active_registration_id", targetRegId);
      safeSessionStorage.setItem("active_registration_data", JSON.stringify(registration));
      safeSessionStorage.setItem("active_training_data", JSON.stringify(training));

      // Route to Page 3: Section C (Technical Quiz Assessment) with explicit state passed
      navigate(`/employee/quiz/${targetRegId}`, {
        state: { registration, training }
      });
    } catch (err: any) {
      console.error("Error saving Section B:", err);
      alert("Failed to save action plan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center text-sm gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span>Loading Section B: Action Plan...</span>
      </div>
    );
  }

  if (!registration || !training) {
    const fallbackTrId = training?.id || safeSessionStorage.getItem("active_training_id");
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Registration Record Not Found
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 max-w-sm">
          Your active registration session could not be verified. Please complete the initial registration or return to Section A.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {effectiveRegId && (
            <button
              onClick={() => {
                soundEffects.playNavigate();
                navigate(`/employee/feedback/${effectiveRegId}`, {
                  state: { registration, training }
                });
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Section A
            </button>
          )}
          {fallbackTrId ? (
            <button
              onClick={() => {
                soundEffects.playNavigate();
                navigate(`/employee/register/${fallbackTrId}`);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Fill Registration Form
            </button>
          ) : (
            <button
              onClick={() => effectiveRegId ? fetchData(effectiveRegId) : window.location.reload()}
              className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Loading
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors">
      <HeaderBranding subtitle="Section B: Action Plan & Learnings Implementation" />

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 my-4 space-y-6">
        {/* Pre-Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                Step 3 of 4: Section B
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Action Plan
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">{training.title}</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Employee: <strong className="text-slate-900 dark:text-white">{registration.employeeName}</strong> (
              {registration.employeeCode}) • {registration.department}
            </p>
          </div>
          <div className="text-left sm:text-right text-xs text-blue-600 dark:text-blue-300">
            <p className="font-semibold">{training.trainerName}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Date: {training.trainingDate}</p>
          </div>
        </div>

        {/* Section B Card */}
        <form onSubmit={handleSubmitSectionB} className="space-y-6">
          <GlassCard className="p-6 sm:p-8 space-y-5 border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60">
                  Action Plan & Takeaways
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                Section – B
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Please specify three key takeaways you learned today and your expected timeline to implement them in your daily operations.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold">
                    <th className="p-3.5 w-12 text-center border-r border-slate-200 dark:border-slate-800">#</th>
                    <th className="p-3.5 border-r border-slate-200 dark:border-slate-800">
                      Can you write three interesting learning / take aways that you can apply to improve your performance /behaviour /competency?
                    </th>
                    <th className="p-3.5 sm:w-56 whitespace-nowrap">
                      By when can you apply them :<br />
                      <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        In a Week / Month / Quarter / Year
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950/60">
                  {(["a", "b", "c"] as const).map((rowKey) => (
                    <tr key={rowKey} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5 text-center font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 align-top pt-4">
                        {rowKey}.
                      </td>
                      <td className="p-3.5 border-r border-slate-200 dark:border-slate-800">
                        <textarea
                          rows={2}
                          value={sectionB[rowKey].learning}
                          onChange={(e) => handleSectionBChange(rowKey, "learning", e.target.value)}
                          placeholder={`Write your learning / takeaway (${rowKey})...`}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                        />
                      </td>
                      <td className="p-3.5 align-top pt-4">
                        <select
                          value={sectionB[rowKey].timeline}
                          onChange={(e) => handleSectionBChange(rowKey, "timeline", e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          {timelineOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              * Note: Feedback and Action Plan responses will be recorded with your official training assessment report.
            </p>
          </GlassCard>

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                soundEffects.playNavigate();
                const targetRegId = registration?.id || effectiveRegId;
                navigate(`/employee/feedback/${targetRegId}`, {
                  state: { registration, training }
                });
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Section A
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto flex-1 py-3.5 px-6 bg-gradient-to-r from-emerald-500 via-emerald-600 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.99]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Saving Section B...</span>
                </>
              ) : (
                <>
                  <span>Save Section B & Proceed to Section C: Assessment Test</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      <BackgroundMusicWidget />
    </div>
  );
};
