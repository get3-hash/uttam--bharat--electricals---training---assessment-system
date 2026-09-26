import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, addDoc, getDocs, query, where, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { EmployeeRegistration, Training, FeedbackRatings } from "../types";
import { HeaderBranding } from "../components/HeaderBranding";
import { GlassCard } from "../components/GlassCard";
import { backgroundMusic } from "../lib/backgroundMusic";
import { soundEffects } from "../lib/soundEffects";
import { safeSessionStorage } from "../lib/storage";
import { BackgroundMusicWidget } from "../components/BackgroundMusicWidget";
import {
  Star,
  ArrowRight,
  Loader2,
  CheckCircle2,
  HelpCircle
} from "lucide-react";

export const FeedbackForm: React.FC = () => {
  const { registrationId } = useParams<{ registrationId: string }>();
  const navigate = useNavigate();

  const [registration, setRegistration] = useState<EmployeeRegistration | null>(null);
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Exact 5 Feedback Ratings (1 to 5 Stars) - Section A
  const [ratings, setRatings] = useState<FeedbackRatings>({
    expectationCovered: 5,
    trainingAidsQuality: 5,
    trainerEffectiveness: 5,
    trainerInvolvement: 5,
    trainerAnsweringQuestions: 5
  });

  useEffect(() => {
    // Keep background ambient focus sound playing
    backgroundMusic.start();
    if (registrationId) {
      fetchData();
    }
  }, [registrationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const regSnap = await getDoc(doc(db, "registrations", registrationId!));
      if (regSnap.exists()) {
        const regData = { id: regSnap.id, ...(regSnap.data() as EmployeeRegistration) };
        setRegistration(regData);

        const trSnap = await getDoc(doc(db, "trainings", regData.trainingId));
        if (trSnap.exists()) {
          setTraining({ id: trSnap.id, ...(trSnap.data() as Training) });
        }

        // Prepopulate if feedback already exists
        const fbSnap = await getDocs(
          query(collection(db, "feedbacks"), where("registrationId", "==", regData.id))
        );
        if (!fbSnap.empty) {
          const fbData = fbSnap.docs[0].data();
          if (fbData.ratings) {
            setRatings(fbData.ratings);
          }
          safeSessionStorage.setItem("active_feedback_id", fbSnap.docs[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading feedback form data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (key: keyof FeedbackRatings, val: number) => {
    soundEffects.playOptionSelect();
    setRatings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmitSectionA = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEffects.playNavigate();
    if (!registration || !training) return;

    setSubmitting(true);
    try {
      // Check if feedback already exists for this candidate
      const fbQuery = query(
        collection(db, "feedbacks"),
        where("registrationId", "==", registration.id)
      );
      const fbSnap = await getDocs(fbQuery);

      let feedbackDocId = "";
      if (!fbSnap.empty) {
        feedbackDocId = fbSnap.docs[0].id;
        await updateDoc(doc(db, "feedbacks", feedbackDocId), {
          ratings,
          updatedAt: new Date().toISOString()
        });
      } else {
        const fbDoc = await addDoc(collection(db, "feedbacks"), {
          registrationId: registration.id,
          trainingId: training.id,
          employeeCode: registration.employeeCode,
          employeeName: registration.employeeName,
          department: registration.department,
          ratings,
          submittedAt: new Date().toISOString()
        });
        feedbackDocId = fbDoc.id;
      }

      safeSessionStorage.setItem("active_feedback_id", feedbackDocId);

      // Route to Page 2: Section B (Action Plan & Learnings)
      navigate(`/employee/section-b/${registration.id}`);
    } catch (err: any) {
      console.error("Error saving Section A feedback:", err);
      alert("Failed to save feedback: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center text-sm gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span>Loading Section A: Feedback Form...</span>
      </div>
    );
  }

  if (!registration || !training) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4">
        <p className="text-slate-500 mb-4">Registration record not found.</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          Go Home
        </button>
      </div>
    );
  }

  const feedbackQuestions: { key: keyof FeedbackRatings; num: number; question: string }[] = [
    {
      key: "expectationCovered",
      num: 1,
      question: "Did this Training Session cover the topic/subject as per your expectation?"
    },
    {
      key: "trainingAidsQuality",
      num: 2,
      question: "How were the quality of slides/videos/audios/training aids?"
    },
    {
      key: "trainerEffectiveness",
      num: 3,
      question: "How was the trainer's efforts and effectiveness in presenting the session?"
    },
    {
      key: "trainerInvolvement",
      num: 4,
      question: "How was the efforts of the trainer in involving everyone into the session?"
    },
    {
      key: "trainerAnsweringQuestions",
      num: 5,
      question: "How well did the trainer invite & answer the questions from the trainees?"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors">
      <HeaderBranding subtitle="Section A: Training Feedback Evaluation" />

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 my-4 space-y-6">
        {/* Registration Pre-Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                Step 2 of 4: Section A
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Feedback Ratings
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

        {/* Feedback Instruction Card */}
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-5 text-center">
          <p className="text-sm sm:text-base font-semibold text-blue-950 dark:text-blue-200 leading-relaxed">
            Please tell us about this training session, to help us improve. Your honest feedback is important for us.
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 font-medium">
            (Rating Scale: 1 Star = Poor &nbsp;•&nbsp; 5 Stars = Excellent)
          </p>
        </div>

        <form onSubmit={handleSubmitSectionA} className="space-y-6">
          {/* ========================================================= */}
          {/* SECTION A: TRAINING FEEDBACK RATINGS                      */}
          {/* ========================================================= */}
          <GlassCard className="p-6 sm:p-8 space-y-6 border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                Evaluation Criteria
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                Section A: Session & Trainer Feedback Ratings
              </h3>
            </div>

            <div className="space-y-5">
              {feedbackQuestions.map((q) => {
                const currentVal = ratings[q.key] ?? 5;
                return (
                  <div
                    key={q.key}
                    className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-3 transition-all"
                  >
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                      <span className="text-blue-600 dark:text-blue-400 mr-1.5">{q.num}.</span>
                      {q.question}
                    </label>

                    <div className="flex items-center gap-2 sm:gap-3 pt-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = currentVal >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRatingChange(q.key, star)}
                            aria-label={`${star} Stars`}
                            className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                              isFilled
                                ? "bg-amber-500/20 border-amber-500 text-amber-500 scale-105 shadow-sm"
                                : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:text-slate-500 dark:hover:text-slate-400"
                            }`}
                          >
                            <Star
                              className={`w-5 h-5 sm:w-6 sm:h-6 ${
                                isFilled ? "fill-amber-500 text-amber-500" : ""
                              }`}
                            />
                          </button>
                        );
                      })}
                      <span className="text-xs sm:text-sm font-extrabold text-amber-600 dark:text-amber-300 ml-2 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-800">
                        {currentVal} / 5
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* ========================================================= */}
          {/* SUBMIT BUTTON -> ROUTE TO SECTION B                       */}
          {/* ========================================================= */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-4 bg-gradient-to-r from-blue-600 via-blue-500 to-amber-500 hover:from-blue-500 hover:to-amber-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.99]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Saving Section A...</span>
                </>
              ) : (
                <>
                  <span>Save Section A & Proceed to Section B: Action Plan</span>
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
