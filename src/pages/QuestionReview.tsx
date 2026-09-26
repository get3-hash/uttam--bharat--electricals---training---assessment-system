import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Training, Question } from "../types";
import { GlassCard } from "../components/GlassCard";
import {
  CheckCircle2,
  HelpCircle,
  Save,
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
  Sparkles,
  Trash2,
  Plus,
  X,
  Loader2,
  AlertCircle
} from "lucide-react";

export const QuestionReview: React.FC = () => {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();

  const [training, setTraining] = useState<Training | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Question Delete modal state & notifications
  const [deleteQTarget, setDeleteQTarget] = useState<{ index: number; questionText: string } | null>(null);
  const [deletingQ, setDeletingQ] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Add Question Modal state
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [newQText, setNewQText] = useState("");
  const [newOptA, setNewOptA] = useState("");
  const [newOptB, setNewOptB] = useState("");
  const [newOptC, setNewOptC] = useState("");
  const [newOptD, setNewOptD] = useState("");
  const [newCorrectOpt, setNewCorrectOpt] = useState<number>(0);

  const triggerDeleteQuestion = (indexToDelete: number) => {
    if (questions.length <= 1) {
      setNoticeMessage("A training program must contain at least 1 question.");
      setTimeout(() => setNoticeMessage(null), 4000);
      return;
    }
    const targetQ = questions[indexToDelete];
    setDeleteQTarget({
      index: indexToDelete,
      questionText: targetQ?.questionText || `Question ${indexToDelete + 1}`
    });
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteQTarget) return;
    const indexToDelete = deleteQTarget.index;

    setDeletingQ(true);
    const updated = questions
      .filter((_, idx) => idx !== indexToDelete)
      .map((q, idx) => ({
        ...q,
        questionNumber: idx + 1
      }));

    setQuestions(updated);
    if (currentIndex >= updated.length) {
      setCurrentIndex(Math.max(0, updated.length - 1));
    }

    // Persist immediately to Firestore so changes aren't lost
    if (trainingId) {
      try {
        const isComplete = updated.every(
          (q) => q.correctOption !== null && q.correctOption !== undefined && q.correctOption >= 0
        );
        await updateDoc(doc(db, "trainings", trainingId), {
          questions: updated,
          isAnswerKeyComplete: isComplete
        });
        setNoticeMessage(`Question ${indexToDelete + 1} deleted and updated in database.`);
        setTimeout(() => setNoticeMessage(null), 4000);
      } catch (err: any) {
        console.error("Error auto-saving question deletion:", err);
        setNoticeMessage("Question removed locally. Remember to click Save Answer Key.");
      }
    }

    setDeletingQ(false);
    setDeleteQTarget(null);
  };

  const handleAddQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim()) {
      alert("Please enter the question text.");
      return;
    }
    if (!newOptA.trim() || !newOptB.trim()) {
      alert("Please enter at least Option A and Option B.");
      return;
    }

    const options = [newOptA.trim(), newOptB.trim()];
    if (newOptC.trim()) options.push(newOptC.trim());
    if (newOptD.trim()) options.push(newOptD.trim());

    const newQuestion: Question = {
      id: `custom_${Date.now()}`,
      questionNumber: questions.length + 1,
      questionText: newQText.trim(),
      options: options,
      correctOption: newCorrectOpt < options.length ? newCorrectOpt : 0
    };

    const updated = [...questions, newQuestion];
    setQuestions(updated);
    setCurrentIndex(updated.length - 1);
    setShowAddQuestionModal(false);

    setNewQText("");
    setNewOptA("");
    setNewOptB("");
    setNewOptC("");
    setNewOptD("");
    setNewCorrectOpt(0);
  };

  useEffect(() => {
    if (trainingId) {
      fetchTraining();
    }
  }, [trainingId]);

  const fetchTraining = async () => {
    try {
      setLoading(true);
      const snap = await getDoc(doc(db, "trainings", trainingId!));
      if (snap.exists()) {
        const data = snap.data() as Training;
        setTraining({ id: snap.id, ...data });
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCorrectOption = (optionIndex: number) => {
    const updated = [...questions];
    updated[currentIndex].correctOption = optionIndex;
    setQuestions(updated);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSaveAnswerKey = async () => {
    const unselected = questions.filter(
      (q) => q.correctOption === null || q.correctOption === undefined || q.correctOption < 0
    );

    if (unselected.length > 0) {
      if (
        !confirm(
          `There are ${unselected.length} questions without a selected correct answer. Save anyway?`
        )
      ) {
        return;
      }
    }

    setSaving(true);
    try {
      const isComplete = questions.every(
        (q) => q.correctOption !== null && q.correctOption !== undefined && q.correctOption >= 0
      );

      await updateDoc(doc(db, "trainings", trainingId!), {
        questions,
        isAnswerKeyComplete: isComplete
      });

      alert("Answer Key saved permanently in Firestore! Ready for Employee Assessment.");
      navigate("/admin/trainings");
    } catch (err: any) {
      console.error("Error saving answer key:", err);
      alert("Failed to save answer key: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center text-sm transition-colors">
        Loading Question Review Screen...
      </div>
    );
  }

  if (!training || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 transition-colors">
        <p className="text-slate-600 dark:text-slate-400 mb-4">No questions found for this training session.</p>
        <button
          onClick={() => navigate("/admin/trainings")}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          Back to Trainings
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const totalCount = questions.length;
  const answeredCount = questions.filter(
    (q) => q.correctOption !== null && q.correctOption !== undefined && q.correctOption >= 0
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto transition-colors">
      {/* Notice Banner */}
      {noticeMessage && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>{noticeMessage}</span>
          <button onClick={() => setNoticeMessage(null)} className="text-amber-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
            Step 4: AI Answer Key Review
          </span>
          <h1 className="text-xl font-bold text-white mt-1">{training.title}</h1>
          <p className="text-xs text-slate-400">
            Select the correct option for each extracted question. No typing required!
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddQuestionModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Question
          </button>

          <button
            onClick={handleSaveAnswerKey}
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Answer Key Permanently"}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-300">
            Answer Key Progress: {answeredCount} / {totalCount} Selected
          </span>
          <span className="text-amber-400 font-bold">
            Question {currentIndex + 1} of {totalCount}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Question Review Card */}
      <GlassCard dark className="p-6 sm:p-8 space-y-6 border border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center shrink-0">
              Q{currentIndex + 1}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {currentQ.questionText}
            </h3>
          </div>

          <button
            type="button"
            onClick={() => triggerDeleteQuestion(currentIndex)}
            title="Delete Question"
            className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Delete Question
          </button>
        </div>

        <p className="text-xs text-slate-400 font-medium">
          Click the card corresponding to the CORRECT answer:
        </p>

        {/* Options Cards Grid */}
        <div className="grid grid-cols-1 gap-3">
          {currentQ.options?.map((optText, optIdx) => {
            const isSelected = currentQ.correctOption === optIdx;
            const letter = String.fromCharCode(65 + optIdx); // A, B, C, D

            return (
              <button
                key={optIdx}
                type="button"
                onClick={() => handleSelectCorrectOption(optIdx)}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-4 cursor-pointer ${
                  isSelected
                    ? "bg-emerald-50 dark:bg-emerald-500/20 border-2 border-emerald-600 dark:border-emerald-500 text-emerald-950 dark:text-white shadow-md ring-2 ring-emerald-500/30"
                    : "bg-white dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white shadow-xs"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-transparent"
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="text-sm font-semibold">{optText}</span>
                </div>

                {isSelected && (
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center gap-1 shrink-0 bg-emerald-100 dark:bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-300 dark:border-emerald-500/20">
                    <Check className="w-4 h-4" /> Correct Answer
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-all disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" /> Previous Question
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === totalCount - 1}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 transition-all disabled:opacity-40"
          >
            Next Question <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>

      {/* Quick Jump Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Quick Jump to Question:</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, idx) => {
            const hasAns = q.correctOption !== null && q.correctOption !== undefined && q.correctOption >= 0;
            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  currentIndex === idx
                    ? "bg-blue-600 text-white ring-2 ring-blue-400 shadow-sm"
                    : hasAns
                    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-transparent"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* All Questions List & Quick Delete Management Table */}
      <GlassCard className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-500" /> All Questions in Training ({questions.length})
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Manage or delete individual questions directly from this list.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddQuestionModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-md transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Question
          </button>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {questions.map((q, idx) => {
            const hasAns = q.correctOption !== null && q.correctOption !== undefined && q.correctOption >= 0;
            return (
              <div
                key={q.id || idx}
                className={`p-3.5 rounded-xl border text-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  currentIndex === idx
                    ? "bg-blue-50/80 dark:bg-slate-900 border-blue-500 ring-1 ring-blue-500/30"
                    : "bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  <span className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-transparent flex items-center justify-center shrink-0 shadow-xs">
                    Q{idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{q.questionText}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {hasAns ? (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                          Ans: {String.fromCharCode(65 + q.correctOption!)} ({q.options[q.correctOption!]})
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/20">
                          Answer Not Set
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{q.options?.length || 0} Options</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 font-semibold rounded-lg text-[11px] border border-slate-200 dark:border-transparent transition-all shadow-xs"
                  >
                    Review Q{idx + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDeleteQuestion(idx)}
                    title="Delete Question"
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Add Custom Question Modal */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" /> Add New Custom Question
              </h3>
              <button
                onClick={() => setShowAddQuestionModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuestionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Question Text *
                </label>
                <textarea
                  required
                  rows={2}
                  value={newQText}
                  onChange={(e) => setNewQText(e.target.value)}
                  placeholder="e.g. What is the standard oil viscosity test frequency for power transformers?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Option A *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOptA}
                    onChange={(e) => setNewOptA(e.target.value)}
                    placeholder="e.g. Monthly"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Option B *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOptB}
                    onChange={(e) => setNewOptB(e.target.value)}
                    placeholder="e.g. Annually"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Option C
                  </label>
                  <input
                    type="text"
                    value={newOptC}
                    onChange={(e) => setNewOptC(e.target.value)}
                    placeholder="e.g. Every 5 Years"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Option D
                  </label>
                  <input
                    type="text"
                    value={newOptD}
                    onChange={(e) => setNewOptD(e.target.value)}
                    placeholder="e.g. Only on Breakdown"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Correct Answer *
                </label>
                <select
                  value={newCorrectOpt}
                  onChange={(e) => setNewCorrectOpt(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={0}>Option A</option>
                  <option value={1}>Option B</option>
                  <option value={2}>Option C</option>
                  <option value={3}>Option D</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddQuestionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Question to Set
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Question Modal */}
      {deleteQTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl relative space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Delete Question {deleteQTarget.index + 1}?</h3>
              <p className="text-xs text-slate-400 mt-2 line-clamp-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-left text-slate-300">
                "{deleteQTarget.questionText}"
              </p>
              <p className="text-[11px] text-rose-400 mt-2">
                This question will be deleted and question numbers will be re-indexed automatically.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={deletingQ}
                onClick={() => setDeleteQTarget(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingQ}
                onClick={confirmDeleteQuestion}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deletingQ ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Yes, Delete Question
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
