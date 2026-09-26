import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { EmployeeRegistration, Training, Question, QuizAttempt } from "../types";
import { HeaderBranding } from "../components/HeaderBranding";
import { GlassCard } from "../components/GlassCard";
import { soundEffects } from "../lib/soundEffects";
import { backgroundMusic } from "../lib/backgroundMusic";
import { safeSessionStorage } from "../lib/storage";
import { BackgroundMusicWidget } from "../components/BackgroundMusicWidget";
import confetti from "canvas-confetti";
import {
  Clock,
  ShieldAlert,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Award,
  Zap,
  Volume2,
  VolumeX,
  Sparkles,
  Check,
  AlertCircle,
  X
} from "lucide-react";

export const QuizAssessment: React.FC = () => {
  const { registrationId } = useParams<{ registrationId: string }>();
  const navigate = useNavigate();

  const [registration, setRegistration] = useState<EmployeeRegistration | null>(null);
  const [training, setTraining] = useState<Training | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Quiz Lifecycle states
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins default
  const [tabSwitches, setTabSwitches] = useState(0);
  const [tabWarning, setTabWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [soundMuted, setSoundMuted] = useState<boolean>(() => soundEffects.isMuted());
  const [quizVolume, setQuizVolume] = useState<number>(() => backgroundMusic.getVolume());
  const [showUnansweredConfirmModal, setShowUnansweredConfirmModal] = useState(false);

  useEffect(() => {
    const unsub = backgroundMusic.subscribe((st) => {
      setSoundMuted(st.isMuted);
      setQuizVolume(st.volume);
    });
    return () => unsub();
  }, []);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Keep slow background ambient focus sound running while the quiz page is open
    backgroundMusic.start();
    if (registrationId) {
      fetchQuizData();
    }
  }, [registrationId]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      const regSnap = await getDoc(doc(db, "registrations", registrationId!));
      if (regSnap.exists()) {
        const regData = { id: regSnap.id, ...(regSnap.data() as EmployeeRegistration) };
        setRegistration(regData);

        const trSnap = await getDoc(doc(db, "trainings", regData.trainingId));
        if (trSnap.exists()) {
          const trData = { id: trSnap.id, ...(trSnap.data() as Training) };
          setTraining(trData);
          setQuestions(trData.questions || []);
          setTimeLeft((trData.timeLimitMinutes || 15) * 60);
        }
      }
    } catch (err) {
      console.error("Error loading quiz data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Anti-Cheating: Detect Tab Switch & Window Blur
  useEffect(() => {
    if (!quizStarted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1);
        setTabWarning(true);
        soundEffects.playWarningAlert();
      }
    };

    const handleBlur = () => {
      setTabSwitches((prev) => prev + 1);
      setTabWarning(true);
      soundEffects.playWarningAlert();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [quizStarted]);

  // Countdown Timer
  useEffect(() => {
    if (!quizStarted) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }

        // Play ticking sound when under 60 seconds
        if (prev <= 60) {
          soundEffects.playTick();
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizStarted]);

  const totalCount = questions.length;
  const answeredCount = Object.keys(userAnswers).length;
  const unansweredCount = Math.max(0, totalCount - answeredCount);

  // Keyboard Navigation & Shortcuts for engaging experience
  useEffect(() => {
    if (!quizStarted || totalCount === 0 || showUnansweredConfirmModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") {
        return;
      }

      // Option selection via numbers 1-4 or letters A-D
      const key = e.key.toUpperCase();
      let optIdx: number | null = null;
      if (key === "1" || key === "A") optIdx = 0;
      else if (key === "2" || key === "B") optIdx = 1;
      else if (key === "3" || key === "C") optIdx = 2;
      else if (key === "4" || key === "D") optIdx = 3;

      if (optIdx !== null) {
        const currentQ = questions[currentIndex];
        if (currentQ && currentQ.options && currentQ.options[optIdx] !== undefined) {
          e.preventDefault();
          handleSelectOption(currentIndex, optIdx);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quizStarted, currentIndex, questions, totalCount, showUnansweredConfirmModal]);

  const handleToggleSound = () => {
    soundEffects.playTouchTap();
    const isNowMuted = soundEffects.toggleMute();
    backgroundMusic.setMuted(isNowMuted);
    setSoundMuted(isNowMuted);
    if (!isNowMuted && quizStarted) {
      backgroundMusic.startQuizMusic();
    }
  };

  const handleBoostVolume = () => {
    soundEffects.playTouchTap();
    const nextVol = quizVolume < 0.75 ? 0.95 : 0.55;
    backgroundMusic.setVolume(nextVol);
    setQuizVolume(nextVol);
    if (soundMuted) {
      soundEffects.setMuted(false);
      backgroundMusic.setMuted(false);
      setSoundMuted(false);
    }
  };

  const handleStartQuiz = () => {
    setQuizStarted(true);
    setStartTime(Date.now());
    soundEffects.playNavigate();

    // Start continuous quiz background music IMMEDIATELY upon starting quiz!
    backgroundMusic.startQuizMusic();

    // Attempt Fullscreen Mode
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {}
  };

  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    soundEffects.playOptionSelect();
    setUserAnswers((prev) => ({
      ...prev,
      [questionIdx]: optionIdx
    }));
  };

  const handleNext = () => {
    if (currentIndex < totalCount - 1) {
      soundEffects.playNavigate();
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      soundEffects.playNavigate();
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleJumpToQuestion = (idx: number) => {
    soundEffects.playNavigate();
    setCurrentIndex(idx);
  };

  const handleJumpToNextUnanswered = () => {
    for (let i = 0; i < totalCount; i++) {
      if (userAnswers[i] === undefined) {
        soundEffects.playNavigate();
        setCurrentIndex(i);
        setShowUnansweredConfirmModal(false);
        return;
      }
    }
  };

  const handleAutoSubmit = () => {
    submitQuizAttempt();
  };

  const handleAttemptSubmitClick = () => {
    if (unansweredCount > 0) {
      soundEffects.playWarningAlert();
      setShowUnansweredConfirmModal(true);
    } else {
      submitQuizAttempt();
    }
  };

  const submitQuizAttempt = async () => {
    if (!registration || !training || submitting) return;

    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      // Calculate Score
      let correctCount = 0;
      questions.forEach((q, idx) => {
        const selected = userAnswers[idx];
        if (selected !== undefined && selected === q.correctOption) {
          correctCount++;
        }
      });

      const totalQuestions = questions.length;
      const wrongCount = totalQuestions - correctCount;
      const percentage =
        totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
      const passingPct = training.passingPercentage || 70;
      const passed = percentage >= passingPct;

      const durationSeconds = Math.round((Date.now() - startTime) / 1000);

      if (passed) {
        soundEffects.playVictoryFanfare();
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 }
          });
        } catch (e) {}
      } else {
        soundEffects.playFailSound();
      }

      const attemptDoc = await addDoc(collection(db, "quiz_attempts"), {
        registrationId: registration.id,
        trainingId: training.id,
        employeeCode: registration.employeeCode,
        employeeName: registration.employeeName,
        department: registration.department,
        score: correctCount,
        totalQuestions,
        correctCount,
        wrongCount,
        percentage,
        passed,
        userAnswers,
        attemptTimeSeconds: durationSeconds,
        tabSwitches,
        submittedAt: new Date().toISOString()
      });

      safeSessionStorage.setItem("active_attempt_id", attemptDoc.id);

      // Stop slow background sound as quiz is finished and navigating to certificate
      backgroundMusic.stop();

      // Route to Step 8: Certificate / Result View
      navigate(`/employee/certificate/${attemptDoc.id}`);
    } catch (err: any) {
      console.error("Error submitting quiz attempt:", err);
      alert("Failed to submit assessment: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Format Time
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  const isLowTime = timeLeft <= 120; // 2 mins or less

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center text-sm transition-colors">
        Loading Assessment Questions...
      </div>
    );
  }

  if (!registration || !training || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 transition-colors">
        <p className="text-slate-600 dark:text-slate-400 mb-4">Assessment questions not available for this session.</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          Go Home
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div
      onCopy={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between select-none transition-colors"
    >
      <HeaderBranding subtitle="Section C: Technical Assessment Test (Anti-Cheating Proctored)" />

      {!quizStarted ? (
        /* ========================================================= */
        /* PRE-QUIZ RULES SCREEN (UTTAM BRAND HARMONIZED)             */
        /* ========================================================= */
        <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 my-6">
          <GlassCard className="p-6 sm:p-8 space-y-6 border border-[#D5D4D4] dark:border-[#403F3E] shadow-xl relative overflow-hidden bg-white dark:bg-[#2B2A28]">
            {/* Ambient subtle glow */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br from-[#008DD2]/10 via-[#59B5E2]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="text-center space-y-2 relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#006393] to-[#008DD2] text-white mx-auto flex items-center justify-center shadow-md shadow-[#008DD2]/20">
                <Award className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-[#2B2A28] dark:text-white">Section C: Assessment Test</h2>
              <p className="text-xs text-[#757573] dark:text-[#D5D4D4] font-medium">
                Uttam (Bharat) Electricals Pvt. Ltd. • <span className="text-[#008DD2] dark:text-[#59B5E2] font-bold">{training.title}</span>
              </p>
            </div>

            {/* Brand Stat Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-[#E6F4FA] dark:bg-[#403F3E] border border-[#CCE8F6] dark:border-[#52514E] shadow-2xs">
                <span className="text-xs text-[#006393] dark:text-[#59B5E2] font-bold block">Total Questions</span>
                <span className="text-2xl font-black text-[#2B2A28] dark:text-white mt-0.5 block">{questions.length}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 shadow-2xs">
                <span className="text-xs text-rose-800 dark:text-rose-300 font-bold block">Unanswered</span>
                <span className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-0.5 block">{questions.length}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#403F3E] border border-[#D5D4D4] dark:border-[#52514E] shadow-2xs">
                <span className="text-xs text-[#403F3E] dark:text-[#D5D4D4] font-bold block">Time Limit</span>
                <span className="text-2xl font-black text-[#2B2A28] dark:text-white mt-0.5 block">
                  {training.timeLimitMinutes || 15} Mins
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#E6F4FA] dark:bg-[#403F3E] border border-[#59B5E2]/40 shadow-2xs">
                <span className="text-xs text-[#006393] dark:text-[#59B5E2] font-bold block">Passing Mark</span>
                <span className="text-2xl font-black text-[#008DD2] dark:text-[#59B5E2] mt-0.5 block">
                  {training.passingPercentage || 70}%
                </span>
              </div>
            </div>

            {/* Sound Notice & Audio Feature */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-[#E6F4FA] dark:bg-[#403F3E] rounded-2xl border border-[#CCE8F6] dark:border-[#52514E] text-xs text-[#2B2A28] dark:text-[#EAEAEA]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#008DD2] dark:text-[#59B5E2] shrink-0" />
                <span className="font-semibold">Background Focus Music & Sound FX enabled for clear test experience.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBoostVolume}
                  className="px-2.5 py-1.5 rounded-xl bg-[#CCE8F6] dark:bg-[#2B2A28] text-[#006393] dark:text-[#59B5E2] border border-[#59B5E2]/40 flex items-center gap-1 font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
                  title="Boost Volume Level"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{Math.round(quizVolume * 100)}% Volume</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#2B2A28] hover:bg-[#EAEAEA] text-[#2B2A28] dark:text-[#EAEAEA] border border-[#D5D4D4] dark:border-[#52514E] flex items-center gap-1 font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
                  title="Toggle Sound & Music"
                >
                  {soundMuted ? <VolumeX className="w-3.5 h-3.5 text-[#757573]" /> : <Volume2 className="w-3.5 h-3.5 text-[#008DD2] animate-pulse" />}
                  <span>{soundMuted ? "Audio Muted" : "Audio On"}</span>
                </button>
              </div>
            </div>

            <div className="bg-rose-50/80 dark:bg-rose-950/20 p-5 rounded-2xl border border-rose-300 dark:border-rose-500/30 space-y-3 shadow-2xs">
              <h3 className="text-xs font-black text-rose-800 dark:text-rose-400 flex items-center gap-2 uppercase tracking-wide">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Proctored Assessment Rules
              </h3>
              <ul className="text-xs text-[#403F3E] dark:text-[#D5D4D4] space-y-2 list-disc pl-5 font-medium">
                <li>
                  <strong className="text-[#2B2A28] dark:text-white font-bold">Fullscreen Enforcement:</strong> Switching tabs or minimizing the window will trigger anti-cheating alerts logged on your official score report.
                </li>
                <li>
                  <strong className="text-[#2B2A28] dark:text-white font-bold">Copy / Paste & Right Click Disabled:</strong> Copying text or searching outside sources is prohibited.
                </li>
                <li>
                  <strong className="text-[#2B2A28] dark:text-white font-bold">Auto Submit:</strong> When the timer expires, your answers will automatically submit.
                </li>
                <li>
                  <strong className="text-[#2B2A28] dark:text-white font-bold">Passing Score:</strong> Score {training.passingPercentage || 70}% or higher to receive your official Certificate of Completion PDF instantly.
                </li>
              </ul>
            </div>

            <button
              onClick={handleStartQuiz}
              className="w-full py-4 px-6 bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-white font-black text-sm rounded-2xl shadow-lg shadow-[#008DD2]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Zap className="w-5 h-5 fill-white text-white" /> Start Timed Assessment Now
            </button>
          </GlassCard>
        </main>
      ) : (
        /* ========================================================= */
        /* ACTIVE VIBRANT QUIZ ASSESSMENT SCREEN                     */
        /* ========================================================= */
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 my-4 space-y-5">
          {/* Active Timer, Answered/Unanswered Stats & Action Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 sticky top-16 z-30 shadow-lg">
            <div className="flex items-center flex-wrap gap-3">
              {/* Countdown Timer with Warning Color */}
              <div
                className={`px-3 py-1.5 rounded-xl border font-black text-sm flex items-center gap-2 shadow-xs transition-colors ${
                  isLowTime
                    ? "bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400 animate-pulse"
                    : "bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-300"
                }`}
              >
                <Clock className={`w-4 h-4 ${isLowTime ? "text-rose-500 animate-spin" : "text-amber-500"}`} />
                <span>{timeStr}</span>
              </div>

              {/* Live Answered Metric */}
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{answeredCount} Answered</span>
              </span>

              {/* Live Unanswered Metric (Requested by user) */}
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>{unansweredCount} Unanswered</span>
              </span>
            </div>

            {/* Anti-cheating badge, Sound toggle & Fullscreen */}
            <div className="flex items-center gap-2">
              {tabSwitches > 0 && (
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-500" /> {tabSwitches} Switch Alert
                </span>
              )}

              {/* Sound & Continuous Music Toggle Button */}
              <button
                type="button"
                onClick={handleToggleSound}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                title={soundMuted ? "Unmute Quiz Music & Sound" : "Mute Quiz Music & Sound"}
              >
                {soundMuted ? (
                  <>
                    <VolumeX className="w-4 h-4 text-rose-400" />
                    <span className="hidden sm:inline text-rose-500">Music Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400">Music On</span>
                  </>
                )}
              </button>

              {/* Volume Boost / Level Button */}
              {!soundMuted && (
                <button
                  type="button"
                  onClick={handleBoostVolume}
                  className="px-2 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                  title="Click to Boost Volume (55% -> 95% Extra Loud)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{Math.round(quizVolume * 100)}% Loud</span>
                </button>
              )}

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={() => {
                  if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                }}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                title="Toggle Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {tabWarning && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-2 shadow-sm animate-bounce">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <strong>Anti-Cheating Warning:</strong> You switched away from the quiz window. This has been logged.
              </span>
              <button
                onClick={() => setTabWarning(false)}
                className="text-[11px] font-bold underline hover:text-rose-950 dark:hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Question Palette / Navigator Grid */}
          <div className="bg-white dark:bg-[#2B2A28] border border-slate-200 dark:border-[#403F3E] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-1.5">
                <span>Question Navigator ({currentIndex + 1}/{totalCount})</span>
              </span>
              {unansweredCount > 0 && (
                <button
                  type="button"
                  onClick={handleJumpToNextUnanswered}
                  className="text-[11px] font-bold text-[#006B9C] dark:text-[#66C5EF] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Jump to next unanswered ({unansweredCount}) <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {questions.map((_, idx) => {
                const isAnswered = userAnswers[idx] !== undefined;
                const isCurrent = idx === currentIndex;
                const isLastQuestion = idx === totalCount - 1;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleJumpToQuestion(idx)}
                    className={`w-9 h-9 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer relative ${
                      isCurrent
                        ? "bg-[#008DD2] hover:bg-[#0078B2] text-white ring-2 ring-[#59B5E2] shadow-md scale-105"
                        : isAnswered
                        ? "bg-[#0078B2] hover:bg-[#006393] text-white shadow-xs"
                        : isLastQuestion
                        ? "bg-[#E6F4FA] hover:bg-[#CCE8F6] dark:bg-[#403F3E] dark:hover:bg-[#52514E] text-[#006393] dark:text-[#59B5E2] border-2 border-[#008DD2] font-black shadow-xs"
                        : "bg-white hover:bg-[#EAEAEA] dark:bg-[#403F3E] dark:hover:bg-[#52514E] text-[#2B2A28] dark:text-white border border-[#D5D4D4] dark:border-[#52514E] shadow-2xs"
                    }`}
                    title={isLastQuestion ? `Question ${idx + 1} (Final Question)` : `Question ${idx + 1}`}
                  >
                    {idx + 1}
                    {isAnswered && !isCurrent && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white dark:bg-[#2B2A28] rounded-full flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5 text-[#008DD2] stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vibrant Multi-stop Progress Bar (Uttam Blue Gradient) */}
          <div className="w-full bg-[#EAEAEA] dark:bg-[#403F3E] h-2.5 rounded-full overflow-hidden border border-[#D5D4D4] dark:border-[#52514E] shadow-2xs">
            <div
              className="bg-gradient-to-r from-[#006393] via-[#008DD2] to-[#59B5E2] h-full transition-all duration-300 rounded-full"
              style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
            />
          </div>

          {/* Question View Card with Gamified Options */}
          <GlassCard className="p-6 sm:p-8 space-y-6 border border-[#D5D4D4] dark:border-[#403F3E] shadow-sm relative overflow-hidden bg-white dark:bg-[#2B2A28]">
            {/* Ambient subtle decorative background glow */}
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-gradient-to-br from-[#008DD2]/10 via-[#59B5E2]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start gap-4">
              <span
                className={`w-12 h-12 rounded-2xl text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md ${
                  currentIndex + 1 === totalCount
                    ? "bg-gradient-to-br from-[#006393] via-[#008DD2] to-[#59B5E2] shadow-[#008DD2]/25 ring-2 ring-[#008DD2]"
                    : "bg-[#008DD2] shadow-[#008DD2]/20"
                }`}
              >
                {currentIndex + 1}
              </span>
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-extrabold text-[#008DD2] dark:text-[#59B5E2] uppercase tracking-widest flex items-center gap-1.5">
                    Question {currentIndex + 1} of {totalCount}
                  </span>
                  {currentIndex + 1 === totalCount && (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-[#008DD2] text-white shadow-xs flex items-center gap-1 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" /> Final Question • अंतिम प्रश्न #{totalCount}
                    </span>
                  )}
                </div>
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    currentIndex + 1 === totalCount
                      ? "bg-[#E6F4FA] dark:bg-[#403F3E] border-[#008DD2] shadow-xs"
                      : "bg-[#F0F4F8] dark:bg-[#1E1D1C] border-[#D5D4D4] dark:border-[#403F3E]"
                  }`}
                >
                  <h3 className="text-base sm:text-lg font-black text-[#2B2A28] dark:text-white leading-relaxed">
                    {currentQ.questionText}
                  </h3>
                </div>
              </div>
            </div>

            {/* Options List with High Contrast Brand Options */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              {currentQ.options?.map((optText, optIdx) => {
                const isSelected = userAnswers[currentIndex] === optIdx;
                const letter = String.fromCharCode(65 + optIdx);

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(currentIndex, optIdx)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-4 cursor-pointer active:scale-[0.99] ${
                      isSelected
                        ? "bg-[#E6F4FA] dark:bg-[#006393] border-[#008DD2] text-[#006393] dark:text-white ring-2 ring-[#008DD2] dark:ring-[#59B5E2] shadow-md scale-[1.008]"
                        : "bg-white hover:bg-[#E6F4FA]/50 dark:bg-[#2B2A28] dark:hover:bg-[#403F3E] border-[#D5D4D4] dark:border-[#403F3E] hover:border-[#008DD2] dark:hover:border-[#008DD2] text-[#2B2A28] dark:text-white shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 border transition-all ${
                          isSelected
                            ? "bg-[#008DD2] text-white border-[#008DD2] scale-110 shadow-sm"
                            : "bg-[#E6F4FA] dark:bg-[#403F3E] text-[#006393] dark:text-[#E6F4FA] border-[#CCE8F6] dark:border-[#52514E]"
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="text-sm font-bold leading-snug">{optText}</span>
                    </div>

                    {isSelected ? (
                      <span className="w-6 h-6 rounded-full bg-[#008DD2] text-white flex items-center justify-center shrink-0 shadow-sm">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#757573] dark:text-[#B5B4B4] font-bold hidden sm:inline-block">
                        Key [{letter}]
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-6 border-t border-[#EAEAEA] dark:border-[#403F3E]">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#EAEAEA] hover:bg-[#D5D4D4] dark:bg-[#403F3E] dark:hover:bg-[#52514E] text-[#403F3E] dark:text-white border border-[#D5D4D4] dark:border-[#52514E] flex items-center gap-2 transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>

              <div className="flex items-center gap-3">
                {currentIndex === totalCount - 1 ? (
                  <button
                    type="button"
                    onClick={handleAttemptSubmitClick}
                    disabled={submitting}
                    className="px-6 py-3 rounded-xl text-xs font-black bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-white shadow-md shadow-[#008DD2]/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Submitting Assessment..." : "Submit Final Answers"}
                    <Award className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-white shadow-md shadow-[#008DD2]/20 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    Next Question <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Quick Unanswered Warning Banner at Bottom if any questions pending */}
          {unansweredCount > 0 && (
            <div className="p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-2xl flex items-center justify-between text-xs text-amber-950 dark:text-amber-200 shadow-2xs">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>You have <strong className="text-amber-700 dark:text-amber-300">{unansweredCount} unanswered questions</strong> remaining before final submission.</span>
              </span>
              <button
                type="button"
                onClick={handleJumpToNextUnanswered}
                className="font-bold text-[#006B9C] dark:text-[#66C5EF] underline hover:text-[#005075] dark:hover:text-[#99D9F5] cursor-pointer"
              >
                Jump to next
              </button>
            </div>
          )}
        </main>
      )}

      {/* ========================================================= */}
      {/* UNANSWERED QUESTIONS CONFIRMATION MODAL                   */}
      {/* ========================================================= */}
      {showUnansweredConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2B2A28] border border-slate-200 dark:border-[#403F3E] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span>Unanswered Questions Remaining</span>
              </div>
              <button
                onClick={() => setShowUnansweredConfirmModal(false)}
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
              You still have <strong className="text-rose-600 dark:text-rose-400">{unansweredCount} unanswered questions</strong> out of {totalCount}. Any unanswered questions will be marked as 0 marks.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-[#1E1D1B] rounded-xl border border-slate-200 dark:border-[#403F3E] text-xs">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-700 dark:text-slate-400">Answered Questions:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{answeredCount}</span>
              </div>
              <div className="flex justify-between font-semibold mt-1">
                <span className="text-slate-700 dark:text-slate-400">Unanswered Questions:</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">{unansweredCount}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleJumpToNextUnanswered}
                className="w-full py-2.5 px-4 bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Review Unanswered ({unansweredCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnansweredConfirmModal(false);
                  submitQuizAttempt();
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-[#403F3E] dark:hover:bg-[#52514E] text-slate-800 dark:text-[#F8FAFC] border border-slate-300 dark:border-[#52514E] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <BackgroundMusicWidget />
    </div>
  );
};
