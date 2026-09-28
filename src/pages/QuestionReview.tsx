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
  Trash2,
  Plus,
  X,
  Loader2
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
    if (!newQText.trim() || !newOptA.trim() || !newOptB.trim()) {
      alert("Please provide question text and at least 2 options (A and B).");
      return;
    }

    const opts = [newOptA.trim(), newOptB.trim()];
    if (newOptC.trim()) opts.push(newOptC.trim());
    if (newOptD.trim()) opts.push(newOptD.trim());

    const newQ: Question = {
      id: `q_custom_${Date.now()}`,
      questionNumber: questions.length + 1,
      questionText: newQText.trim(),
      options: opts,
      correctOption: Math.min(newCorrectOpt, opts.length - 1)
    };

    const updated = [...questions, newQ];
    setQuestions(updated);
    setCurrentIndex(updated.length - 1);
    setShowAddQuestionModal(false);

    // Reset inputs
    setNewQText("");
    setNewOptA("");
    setNewOptB("");
    setNewOptC("");
    setNewOptD("");
    setNewCorrectOpt(0);

    setNoticeMessage("New question added. Review it and click Save Answer Key.");
    setTimeout(() => setNoticeMessage(null), 4500);
  };

  useEffect(() => {
    if (trainingId) {
      fetchTraining();
    }
  }, [trainingId]);

  const fetchTraining = async () => {
    try {
      setLoading(true);
      const docSnap = await getDoc(doc(db, "trainings", trainingId!));
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...(docSnap.data() as Training) };
        setTraining(data);

        const loadedQuestions: Question[] = (data.questions || []).map((q, idx) => ({
          ...q,
          correctOption: q.correctOption !== undefined ? q.correctOption : 0
        }));

        setQuestions(loadedQuestions);
      }
    } catch (err) {
      console.error("Error loading training for review:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCorrectOption = (optionIndex: number) => {
    const updated = [...questions];
    updated[currentIndex] = {
      ...updated[currentIndex],
      correctOption: optionIndex
    };
    setQuestions(updated);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSaveAnswerKey = async () => {
    if (!trainingId || questions.length === 0) return;
    setSaving(true);
    try {
      const isComplete = questions.every(
        (q) => q.correctOption !== null && q.correctOption !== undefined && q.correctOption >= 0
      );

      await updateDoc(doc(db, "trainings", trainingId), {
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
      <div className="min-h-screen bg-[#EAEAEA] text-[#2B2A28] flex items-center justify-center text-sm transition-colors">
        Loading Question Review Screen...
      </div>
    );
  }

  if (!training || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#EAEAEA] text-[#403F3E] flex flex-col items-center justify-center p-4 transition-colors">
        <p className="text-[#757573] mb-4">No questions found for this training session.</p>
        <button
          onClick={() => navigate("/admin/trainings")}
          className="px-4 py-2 bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-[#FFFFFF] rounded-xl text-xs font-bold cursor-pointer"
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
    <div className="min-h-screen bg-[#EAEAEA] text-[#403F3E] p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto transition-colors">
      {/* Notice Banner */}
      {noticeMessage && (
        <div className="bg-[#E6F4FA] border border-[#59B5E2] text-[#006393] p-3 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>{noticeMessage}</span>
          <button onClick={() => setNoticeMessage(null)} className="text-[#008DD2] hover:text-[#006393] font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#D5D4D4] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#006393] bg-[#E6F4FA] px-2.5 py-1 rounded-md border border-[#59B5E2]">
            Step 4: AI Answer Key Review
          </span>
          <h1 className="text-xl font-bold text-[#2B2A28] mt-1">{training.title}</h1>
          <p className="text-xs text-[#757573]">
            Select the correct option for each extracted question. No typing required!
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddQuestionModal(true)}
            className="px-4 py-2.5 bg-[#E6F4FA] hover:bg-[#CCE8F6] text-[#006393] border border-[#59B5E2] font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Question
          </button>

          <button
            onClick={handleSaveAnswerKey}
            disabled={saving}
            className="px-5 py-2.5 bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-[#FFFFFF] font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Answer Key Permanently"}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#D5D4D4] space-y-2 shadow-xs">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-[#403F3E]">
            Answer Key Progress: {answeredCount} / {totalCount} Selected
          </span>
          <span className="text-[#008DD2] font-bold">
            Question {currentIndex + 1} of {totalCount}
          </span>
        </div>
        <div className="w-full bg-[#EAEAEA] h-2 rounded-full overflow-hidden border border-[#D5D4D4]">
          <div
            className="bg-[#008DD2] h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Question Review Card */}
      <div className="bg-[#FFFFFF] p-6 sm:p-8 space-y-6 border border-[#D5D4D4] rounded-2xl shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#008DD2] text-[#FFFFFF] font-extrabold flex items-center justify-center shrink-0">
              Q{currentIndex + 1}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[#2B2A28] leading-relaxed">
              {currentQ.questionText}
            </h3>
          </div>

          <button
            type="button"
            onClick={() => triggerDeleteQuestion(currentIndex)}
            title="Delete Question"
            className="px-3 py-1.5 bg-[#EAEAEA] hover:bg-[#D5D4D4] text-[#403F3E] border border-[#D5D4D4] rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#2B2A28]" /> Delete Question
          </button>
        </div>

        <p className="text-xs text-[#757573] font-medium">
          Click the card corresponding to the CORRECT answer:
        </p>

        {/* Options Cards Grid */}
        <div className="grid grid-cols-1 gap-3">
          {currentQ.options?.map((optText, optIdx) => {
            const isSelected = currentQ.correctOption === optIdx;
            const letter = String.fromCharCode(65 + optIdx);

            return (
              <button
                key={optIdx}
                type="button"
                onClick={() => handleSelectCorrectOption(optIdx)}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-4 cursor-pointer ${
                  isSelected
                    ? "bg-[#E6F4FA] border-2 border-[#008DD2] text-[#006393] shadow-xs ring-1 ring-[#008DD2]"
                    : "bg-[#FFFFFF] border-[#D5D4D4] hover:border-[#59B5E2] hover:bg-[#E6F4FA]/30 text-[#403F3E] shadow-xs"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-[#008DD2] text-[#FFFFFF] shadow-xs"
                        : "bg-[#EAEAEA] text-[#2B2A28] border border-[#D5D4D4]"
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="text-sm font-semibold">{optText}</span>
                </div>

                {isSelected && (
                  <span className="text-[#006393] font-bold text-xs flex items-center gap-1 shrink-0 bg-[#CCE8F6] px-2.5 py-1 rounded-md border border-[#59B5E2]">
                    <Check className="w-4 h-4 text-[#008DD2]" /> Correct Answer
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-[#D5D4D4]">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#E6F4FA] hover:bg-[#CCE8F6] text-[#006393] border border-[#59B5E2] flex items-center gap-2 transition-all disabled:opacity-40 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Previous Question
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === totalCount - 1}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-[#FFFFFF] flex items-center gap-2 transition-all disabled:opacity-40 cursor-pointer shadow-xs"
          >
            Next Question <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Jump Bar */}
      <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#D5D4D4] shadow-xs">
        <p className="text-xs font-semibold text-[#757573] mb-2">Quick Jump to Question:</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, idx) => {
            const hasAns = q.correctOption !== null && q.correctOption !== undefined && q.correctOption >= 0;
            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentIndex === idx
                    ? "bg-[#008DD2] text-[#FFFFFF] ring-2 ring-[#0078B2] shadow-xs"
                    : hasAns
                    ? "bg-[#E6F4FA] text-[#006393] border border-[#59B5E2]"
                    : "bg-[#EAEAEA] text-[#403F3E] border border-[#D5D4D4]"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* All Questions List & Quick Delete Management Table */}
      <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#D5D4D4] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#D5D4D4]">
          <div>
            <h3 className="text-sm font-bold text-[#2B2A28] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#008DD2]" /> All Questions in Training ({questions.length})
            </h3>
            <p className="text-[11px] text-[#757573]">
              Manage or delete individual questions directly from this list.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddQuestionModal(true)}
            className="px-3 py-1.5 bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-[#FFFFFF] text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs transition-all cursor-pointer"
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
                    ? "bg-[#E6F4FA] border-[#008DD2] ring-1 ring-[#008DD2]"
                    : "bg-[#FFFFFF] border-[#D5D4D4] hover:bg-[#E6F4FA]/30 shadow-xs"
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  <span className="w-7 h-7 rounded-lg bg-[#EAEAEA] text-[#2B2A28] font-bold border border-[#D5D4D4] flex items-center justify-center shrink-0 shadow-xs">
                    Q{idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-[#2B2A28]">{q.questionText}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {hasAns ? (
                        <span className="text-[10px] font-bold text-[#006393] bg-[#E6F4FA] px-2 py-0.5 rounded border border-[#59B5E2]">
                          Ans: {String.fromCharCode(65 + q.correctOption!)} ({q.options[q.correctOption!]})
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#757573] bg-[#EAEAEA] px-2 py-0.5 rounded border border-[#D5D4D4]">
                          Answer Not Set
                        </span>
                      )}
                      <span className="text-[10px] text-[#757573]">{q.options?.length || 0} Options</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className="px-2.5 py-1.5 bg-[#FFFFFF] hover:bg-[#EAEAEA] text-[#2B2A28] font-semibold rounded-lg text-[11px] border border-[#D5D4D4] transition-all shadow-xs cursor-pointer"
                  >
                    Review Q{idx + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDeleteQuestion(idx)}
                    title="Delete Question"
                    className="p-1.5 bg-[#EAEAEA] hover:bg-[#D5D4D4] text-[#2B2A28] border border-[#D5D4D4] rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Custom Question Modal */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 bg-[#2B2A28]/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#FFFFFF] border border-[#D5D4D4] rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-[#D5D4D4] pb-3">
              <h3 className="text-base font-bold text-[#2B2A28] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#008DD2]" /> Add New Custom Question
              </h3>
              <button
                onClick={() => setShowAddQuestionModal(false)}
                className="text-[#757573] hover:text-[#2B2A28] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuestionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#403F3E] mb-1">
                  Question Text *
                </label>
                <textarea
                  required
                  rows={2}
                  value={newQText}
                  onChange={(e) => setNewQText(e.target.value)}
                  placeholder="e.g. What is the standard oil viscosity test frequency for power transformers?"
                  className="w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-xl p-3 text-sm text-[#2B2A28] placeholder-[#757573] focus:outline-none focus:border-[#008DD2] focus:bg-[#E6F4FA]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#403F3E] mb-1">
                    Option A *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOptA}
                    onChange={(e) => setNewOptA(e.target.value)}
                    placeholder="e.g. Monthly"
                    className="w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-xl px-3 py-2 text-xs text-[#2B2A28] placeholder-[#757573] focus:outline-none focus:border-[#008DD2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#403F3E] mb-1">
                    Option B *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOptB}
                    onChange={(e) => setNewOptB(e.target.value)}
                    placeholder="e.g. Annually"
                    className="w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-xl px-3 py-2 text-xs text-[#2B2A28] placeholder-[#757573] focus:outline-none focus:border-[#008DD2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#403F3E] mb-1">
                    Option C
                  </label>
                  <input
                    type="text"
                    value={newOptC}
                    onChange={(e) => setNewOptC(e.target.value)}
                    placeholder="e.g. Every 5 Years"
                    className="w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-xl px-3 py-2 text-xs text-[#2B2A28] placeholder-[#757573] focus:outline-none focus:border-[#008DD2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#403F3E] mb-1">
                    Option D
                  </label>
                  <input
                    type="text"
                    value={newOptD}
                    onChange={(e) => setNewOptD(e.target.value)}
                    placeholder="e.g. Only on Breakdown"
                    className="w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-xl px-3 py-2 text-xs text-[#2B2A28] placeholder-[#757573] focus:outline-none focus:border-[#008DD2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#403F3E] mb-1">
                  Select Correct Answer *
                </label>
                <select
                  value={newCorrectOpt}
                  onChange={(e) => setNewCorrectOpt(Number(e.target.value))}
                  className="w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-xl px-3 py-2 text-xs text-[#2B2A28] focus:outline-none focus:border-[#008DD2]"
                >
                  <option value={0}>Option A</option>
                  <option value={1}>Option B</option>
                  <option value={2}>Option C</option>
                  <option value={3}>Option D</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#D5D4D4]">
                <button
                  type="button"
                  onClick={() => setShowAddQuestionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#EAEAEA] hover:bg-[#D5D4D4] text-[#403F3E] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-[#FFFFFF] shadow-sm flex items-center gap-1.5 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-[#2B2A28]/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#D5D4D4] rounded-2xl max-w-md w-full p-6 text-center shadow-md relative space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#EAEAEA] border border-[#D5D4D4] text-[#2B2A28] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#2B2A28]">Delete Question {deleteQTarget.index + 1}?</h3>
              <p className="text-xs text-[#403F3E] mt-2 line-clamp-3 bg-[#EAEAEA] p-2.5 rounded-xl border border-[#D5D4D4] text-left">
                "{deleteQTarget.questionText}"
              </p>
              <p className="text-[11px] text-[#757573] mt-2">
                This question will be deleted and question numbers will be re-indexed automatically.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={deletingQ}
                onClick={() => setDeleteQTarget(null)}
                className="flex-1 py-2.5 bg-[#EAEAEA] hover:bg-[#D5D4D4] text-[#403F3E] font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingQ}
                onClick={confirmDeleteQuestion}
                className="flex-1 py-2.5 bg-[#2B2A28] hover:bg-[#403F3E] text-[#FFFFFF] font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
