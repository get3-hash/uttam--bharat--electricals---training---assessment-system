import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { generateTrainingQRCode } from "../lib/qrGenerator";
import { GlassCard } from "../components/GlassCard";
import { Question } from "../types";
import {
  FileText,
  Upload,
  Sparkles,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
  Bot,
  Plus,
  Building,
  Trash2,
  X,
  Loader2,
  Presentation,
  FileSpreadsheet,
  Globe,
  Check,
  FileCheck,
  Sliders,
  CheckCircle
} from "lucide-react";
import { SAMPLE_TRANSFORMER_QUESTIONS } from "../lib/sampleQuestions";

export const CreateTraining: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [trainingDate, setTrainingDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState("");
  const [folderName, setFolderName] = useState("");
  const [passingPercentage, setPassingPercentage] = useState<number>(70);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(15);

  // Document & Question Extraction state (PDF, PPT, Word, Excel, Google Sheets)
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [fileSourceTab, setFileSourceTab] = useState<"file" | "sheet">("file");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [extractionMode, setExtractionMode] = useState<"auto" | "generate_mcq" | "extract_exam">("auto");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [docLanguage, setDocLanguage] = useState<"en" | "hi" | "hinglish">("en");
  const [topicLanguage, setTopicLanguage] = useState<"en" | "hi" | "hinglish">("en");
  const [topicCount, setTopicCount] = useState<number>(10);

  const [aiParsing, setAiParsing] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [generatingTopic, setGeneratingTopic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Add Question Modal state
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [newQText, setNewQText] = useState("");
  const [newOptA, setNewOptA] = useState("");
  const [newOptB, setNewOptB] = useState("");
  const [newOptC, setNewOptC] = useState("");
  const [newOptD, setNewOptD] = useState("");
  const [newCorrectOpt, setNewCorrectOpt] = useState<number>(0);

  // Helper to get file type information
  const getDocFileInfo = (file: File | null) => {
    if (!file) return null;
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf")) {
      return { type: "PDF", label: "PDF Document / Exam Paper", icon: "pdf", color: "rose" };
    }
    if (name.endsWith(".pptx") || name.endsWith(".ppt")) {
      return { type: "PPTX", label: "PowerPoint Presentation Slides", icon: "pptx", color: "amber" };
    }
    if (name.endsWith(".docx") || name.endsWith(".doc")) {
      return { type: "DOCX", label: "Microsoft Word Document", icon: "docx", color: "blue" };
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
      return { type: "EXCEL", label: "Excel / CSV Spreadsheet", icon: "xlsx", color: "emerald" };
    }
    return { type: "DOC", label: "Document File", icon: "doc", color: "slate" };
  };

  const handleToggleCorrectOption = (questionIdx: number, optionIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === questionIdx ? { ...q, correctOption: optionIdx } : q))
    );
  };

  const handleDeleteQuestion = (indexToDelete: number) => {
    const updated = questions.filter((_, idx) => idx !== indexToDelete).map((q, idx) => ({
      ...q,
      questionNumber: idx + 1
    }));
    setQuestions(updated);
  };

  const handleAddQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim()) {
      setAiStatusMessage("Error: Please enter the question text.");
      return;
    }
    if (!newOptA.trim() || !newOptB.trim()) {
      setAiStatusMessage("Error: Please enter at least Option A and Option B.");
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

    setQuestions([...questions, newQuestion]);
    setShowAddQuestionModal(false);
    setNewQText("");
    setNewOptA("");
    setNewOptB("");
    setNewOptC("");
    setNewOptD("");
    setNewCorrectOpt(0);
  };

  // Unified Document / Google Sheet question parser and generator (PDF, PPT, Word, Excel, Google Sheets)
  const handleDocumentUploadAndExtract = async () => {
    if (fileSourceTab === "file" && !selectedDocFile) {
      alert("Please choose a PDF, PowerPoint (.pptx/.ppt), Word (.docx), or Excel (.xlsx) file first.");
      return;
    }

    if (fileSourceTab === "sheet" && !googleSheetUrl.trim()) {
      alert("Please paste your Google Sheet link first (e.g. https://docs.google.com/spreadsheets/d/...).");
      return;
    }

    setAiParsing(true);
    setAiStatusMessage("Reading document and generating MCQs with answers using Gemini 3.8 Flash...");

    try {
      const formData = new FormData();
      if (fileSourceTab === "file" && selectedDocFile) {
        formData.append("file", selectedDocFile);
      }
      if (fileSourceTab === "sheet") {
        formData.append("googleSheetUrl", googleSheetUrl.trim());
      }
      formData.append("mode", extractionMode);
      formData.append("questionCount", String(questionCount));
      formData.append("language", docLanguage);
      if (title.trim()) formData.append("topic", title.trim());

      const res = await fetch("/api/parse-training-document", {
        method: "POST",
        body: formData
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        throw new Error("Unable to connect to AI service. Server returned an invalid response.");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process document and generate questions");
      }

      if (data.questions && data.questions.length > 0) {
        const formatted: Question[] = data.questions.map((q: any, idx: number) => ({
          id: `ai_${Date.now()}_${idx}`,
          questionNumber: idx + 1,
          questionText: q.questionText,
          options: q.options || ["Option A", "Option B", "Option C", "Option D"],
          correctOption:
            q.correctOption !== undefined && q.correctOption !== null && q.correctOption >= 0 && q.correctOption < 4
              ? q.correctOption
              : 0
        }));

        setQuestions(formatted);
        const sourceLabel =
          fileSourceTab === "sheet"
            ? "Google Sheet"
            : selectedDocFile?.name.split(".").pop()?.toUpperCase() || "document";

        setAiStatusMessage(
          `✓ Success! Generated ${formatted.length} multiple choice questions with answer keys from ${sourceLabel}. You can review and adjust any answer key on the right.`
        );
      } else {
        setAiStatusMessage("Analyzed document but could not generate questions. Please verify document content or try another file.");
      }
    } catch (err: any) {
      console.error("AI document processing error:", err);
      setAiStatusMessage(err.message || "Unable to connect to AI service. Please try again.");
    } finally {
      setAiParsing(false);
    }
  };

  // Handle AI Question Generation for Topic
  const handleGenerateAiTopicQuestions = async () => {
    if (!title.trim()) {
      setAiStatusMessage("Error: Please enter a Training Session Topic first.");
      return;
    }

    setGeneratingTopic(true);
    setAiStatusMessage(`Generating ${topicCount} practical questions in ${topicLanguage.toUpperCase()} using Gemini 3.8 Flash...`);

    const activeDept = department.trim() || "Quality & Production";

    try {
      const res = await fetch("/api/generate-topic-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: title,
          department: activeDept,
          count: topicCount,
          language: topicLanguage
        })
      });

      let data: any = {};
      try {
        const rawText = await res.text();
        data = JSON.parse(rawText);
      } catch {
        throw new Error("Unable to connect to AI service. Server returned an invalid response.");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate AI questions");
      }

      if (data.questions && data.questions.length > 0) {
        const formatted: Question[] = data.questions.map((q: any, idx: number) => ({
          id: `gen_${Date.now()}_${idx}`,
          questionNumber: idx + 1,
          questionText: q.questionText,
          options: q.options,
          correctOption: typeof q.correctOption === "number" && q.correctOption >= 0 ? q.correctOption : 0
        }));
        setQuestions(formatted);
        setAiStatusMessage(`✓ Successfully generated ${formatted.length} questions with answer keys using Gemini 3.8 Flash!`);
      } else {
        setAiStatusMessage("AI generated response but returned no questions. Please try again.");
      }
    } catch (err: any) {
      console.error("AI generation error:", err);
      setAiStatusMessage(err.message || "Unable to connect to AI service. Please try again.");
    } finally {
      setGeneratingTopic(false);
    }
  };

  const handleSaveTraining = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitError(null);

    const finalTitle = title.trim() || "Transformer Technical & Safety Training Session";
    const finalDept = department.trim() || "Testing & Quality Assurance";
    const finalTrainer = trainerName.trim() || "Technical Training Lead";

    setSaving(true);

    let activeQuestions = [...questions];

    // If no questions are currently added, auto-populate standard/sample transformer questions
    if (activeQuestions.length === 0) {
      activeQuestions = [...SAMPLE_TRANSFORMER_QUESTIONS];
      setQuestions(activeQuestions);
    }

    try {
      // Check if all correct options are selected
      const isComplete = activeQuestions.every((q) => q.correctOption !== null && q.correctOption >= 0);

      // Create doc in Firestore
      const docRef = await addDoc(collection(db, "trainings"), {
        title: finalTitle,
        department: finalDept,
        folderName: folderName.trim() || `${finalDept} Session Folder`,
        trainerName: finalTrainer,
        trainingDate: trainingDate || new Date().toISOString().split("T")[0],
        description: description.trim(),
        passingPercentage: Number(passingPercentage) || 70,
        timeLimitMinutes: Number(timeLimitMinutes) || 15,
        questions: activeQuestions,
        isAnswerKeyComplete: isComplete,
        createdAt: new Date().toISOString(),
        createdBy: "Admin"
      });

      // Generate QR Code with real training ID in background safely
      try {
        const qrCodeDataUrl = await generateTrainingQRCode(docRef.id);
        if (qrCodeDataUrl) {
          await updateDoc(doc(db, "trainings", docRef.id), {
            qrCodeDataUrl
          });
        }
      } catch (qrErr) {
        console.warn("Background QR code notice:", qrErr);
      }

      // Immediately navigate to review-questions page
      navigate(`/admin/review-questions/${docRef.id}`);
    } catch (err: any) {
      console.error("Error creating training:", err);
      setSubmitError("Failed to save training: " + (err.message || "Please check connection"));
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8 transition-colors">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm dark:shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-500/20">
            Step 3 & 4
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Create Training & AI Question Extraction
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Uttam (Bharat) Electricals Pvt. Ltd. • Automated Question Parser & QR Code Generator
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveTraining} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Details */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard dark className="p-6 space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <BookOpen className="w-5 h-5 text-blue-400" /> Training Session Details
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Training Session Name / Topic *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Transformer Winding Insulation & Oil Breakdown Voltage"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Session Folder / Category Name</span>
                <span className="text-[10px] text-amber-400 font-normal">📁 Groups sessions into folders</span>
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g. Safety Sessions 2026, Quality Testing Folder, Batch #1"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Department *
                </label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Enter department name manually (e.g. Testing & Quality, Winding, Assembly)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Trainer Name *
                </label>
                <input
                  type="text"
                  required
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  placeholder="Enter trainer name (e.g. Er. Rajesh Kumar / Quality Head)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Training Date *
                </label>
                <input
                  type="date"
                  required
                  value={trainingDate}
                  onChange={(e) => setTrainingDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Passing Percentage (%)
                </label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={passingPercentage}
                  onChange={(e) => setPassingPercentage(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Time Limit (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Description / Objectives
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </GlassCard>

          {/* Multi-Format Question Extraction Engine */}
          <GlassCard dark className="p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" /> Multi-Format Question & MCQ Engine
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Powered by Gemini 3.8 Flash • Generates complete MCQs with 4 options & answer keys
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg">
                  {questions.length} Questions Loaded
                </span>
              </div>
            </div>

            {/* Source Mode Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setFileSourceTab("file")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  fileSourceTab === "file"
                    ? "bg-active-bg text-active-text shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> File Upload
              </button>

              <button
                type="button"
                onClick={() => setFileSourceTab("sheet")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  fileSourceTab === "sheet"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> Google Sheets
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuestions(SAMPLE_TRANSFORMER_QUESTIONS);
                  setAiStatusMessage("✓ Loaded 10 standard Transformer Safety & Quality exam questions with answer keys.");
                }}
                className="py-2 px-3 rounded-lg text-xs font-bold text-slate-400 hover:text-amber-300 hover:bg-slate-900 transition-all flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Sample Exam
              </button>

              <button
                type="button"
                onClick={() => setShowAddQuestionModal(true)}
                className="py-2 px-3 rounded-lg text-xs font-bold text-slate-400 hover:text-purple-300 hover:bg-slate-900 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-purple-400" /> Add Manual
              </button>
            </div>

            {/* TAB 1: FILE UPLOAD (PDF, PPT, Word, Excel) */}
            {fileSourceTab === "file" && (
              <div className="space-y-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                    <FileCheck className="w-4 h-4" /> Upload Document or Presentation
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded border border-rose-500/20 font-mono">PDF</span>
                    <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20 font-mono">PPTX / PPT</span>
                    <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20 font-mono">DOCX / DOC</span>
                    <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 font-mono">XLSX / CSV</span>
                  </div>
                </div>

                {/* File Drop / Select Area */}
                <div className="relative border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-xl p-4 transition-colors text-center bg-slate-900/40">
                  <input
                    type="file"
                    id="documentFileInput"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.xlsx,.xls,.csv,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedDocFile(file);
                      if (file) {
                        const info = getDocFileInfo(file);
                        setAiStatusMessage(`Selected "${file.name}" (${info?.label || "File"}). Choose mode & click Generate.`);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />

                  {selectedDocFile ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-slate-900 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                          {selectedDocFile.name.toLowerCase().endsWith(".pptx") || selectedDocFile.name.toLowerCase().endsWith(".ppt") ? (
                            <Presentation className="w-5 h-5 text-amber-400" />
                          ) : selectedDocFile.name.toLowerCase().endsWith(".xlsx") || selectedDocFile.name.toLowerCase().endsWith(".xls") || selectedDocFile.name.toLowerCase().endsWith(".csv") ? (
                            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <FileText className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white truncate max-w-[240px] sm:max-w-md">
                            {selectedDocFile.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {(selectedDocFile.size / 1024 / 1024).toFixed(2)} MB •{" "}
                            <span className="text-emerald-400 font-medium">Ready for AI MCQ generation</span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocFile(null);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md border border-rose-500/20"
                      >
                        Change File
                      </button>
                    </div>
                  ) : (
                    <div className="py-4 space-y-2 pointer-events-none">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-blue-400">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-semibold text-slate-200">
                        Drag & Drop or Click to Upload PDF, PowerPoint Slides, Word Doc, or Excel
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Supports slides with notes, SOP manuals, technical handbooks, or existing question papers
                      </p>
                    </div>
                  )}
                </div>

                {/* Extraction Mode & Configuration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Mode */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Extraction Mode
                    </label>
                    <select
                      value={extractionMode}
                      onChange={(e: any) => setExtractionMode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="auto">⚡ Auto-Detect (Best for all docs)</option>
                      <option value="generate_mcq">📽️ Generate from Slides / Content (PPT/PDF)</option>
                      <option value="extract_exam">📝 Extract Existing Exam Questions</option>
                    </select>
                  </div>

                  {/* Question Count */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Number of MCQs
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[5, 10, 15, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setQuestionCount(num)}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            questionCount === num
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Language
                    </label>
                    <select
                      value={docLanguage}
                      onChange={(e: any) => setDocLanguage(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="en">English (Standard)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="hinglish">Hinglish (Bilingual Technical)</option>
                    </select>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="button"
                  onClick={handleDocumentUploadAndExtract}
                  disabled={aiParsing || !selectedDocFile}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  {aiParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Reading Document & Generating MCQs with Gemini 3.8 Flash...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      Generate {questionCount} MCQs from {selectedDocFile ? selectedDocFile.name.split(".").pop()?.toUpperCase() : "Document"} (with Answers)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 2: GOOGLE SHEETS */}
            {fileSourceTab === "sheet" && (
              <div className="space-y-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Globe className="w-4 h-4" /> Import from Public Google Sheet
                </div>
                <p className="text-[11px] text-slate-400">
                  Paste the Google Sheets URL. Gemini AI will automatically extract question rows or summarize the content into MCQs with 4 options and correct answer keys.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Google Sheets Share Link *
                  </label>
                  <input
                    type="url"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Tip: Ensure access is set to "Anyone with the link can view".
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      MCQ Count
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[5, 10, 15, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setQuestionCount(num)}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            questionCount === num
                              ? "bg-emerald-600 border-emerald-500 text-white"
                              : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Language
                    </label>
                    <select
                      value={docLanguage}
                      onChange={(e: any) => setDocLanguage(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="en">English (Standard)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="hinglish">Hinglish (Bilingual Technical)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDocumentUploadAndExtract}
                  disabled={aiParsing || !googleSheetUrl.trim()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  {aiParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Fetching Google Sheet & Generating MCQs...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      Import Sheet & Generate {questionCount} MCQs (with Answers)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Quick Topic Generator Footer */}
            <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                  <Bot className="w-4 h-4" /> Or Generate from Session Topic Name
                </div>
                <p className="text-[11px] text-slate-400">
                  Topic: <span className="text-slate-200 font-semibold">{title.trim() || "(Enter title above)"}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={topicLanguage}
                  onChange={(e: any) => setTopicLanguage(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="en">EN</option>
                  <option value="hi">HI (हिन्दी)</option>
                  <option value="hinglish">Hinglish</option>
                </select>

                <select
                  value={topicCount}
                  onChange={(e) => setTopicCount(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  <option value={5}>5 Qs</option>
                  <option value={10}>10 Qs</option>
                  <option value={15}>15 Qs</option>
                  <option value={20}>20 Qs</option>
                </select>

                <button
                  type="button"
                  onClick={handleGenerateAiTopicQuestions}
                  disabled={generatingTopic}
                  className="py-1.5 px-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {generatingTopic ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Generate Topic MCQs
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Status / Notification message */}
            {aiStatusMessage && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-amber-300 flex items-start gap-2 animate-in fade-in duration-200">
                <HelpCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span className="leading-relaxed">{aiStatusMessage}</span>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Column: Question Preview & Interactive Answer Keys */}
        <div className="space-y-6">
          <GlassCard dark className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Question Preview
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Click any option to change correct answer)
                  </span>
                </h3>
                <span className="text-xs text-slate-400">{questions.length} items loaded</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddQuestionModal(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  No questions loaded yet. Upload a PDF, PowerPoint (.pptx), Word (.docx), or Excel file, or click Sample Exam.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuestions(SAMPLE_TRANSFORMER_QUESTIONS);
                    setAiStatusMessage("✓ Loaded 10 standard Transformer Safety exam questions.");
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all"
                >
                  Load 10 Standard Questions
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2.5 relative group hover:border-slate-700 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-400 text-xs">Q{idx + 1}.</span>
                        {q.correctOption !== null && q.correctOption !== undefined && q.correctOption >= 0 ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" /> Correct Ans: Option {String.fromCharCode(65 + q.correctOption)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                            Pending Answer Key
                          </span>
                        )}
                      </div>

                      {/* Delete Question Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(idx)}
                        title="Delete Question"
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="font-semibold text-slate-100 pr-4 leading-relaxed">{q.questionText}</p>

                    {/* Interactive Options: Click to set correct answer */}
                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = q.correctOption === oIdx;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleToggleCorrectOption(idx, oIdx)}
                              title={`Click to set Option ${String.fromCharCode(65 + oIdx)} as correct answer`}
                              className={`p-2 text-left rounded-lg border text-[11px] transition-all flex items-start gap-1.5 ${
                                isSelected
                                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-200 font-semibold shadow-sm"
                                  : "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected
                                    ? "bg-emerald-500 text-slate-950 font-black"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span className="leading-snug break-words">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {questions.length === 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  0 questions loaded. Clicking Save will automatically include standard transformer MCQs.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setQuestions(SAMPLE_TRANSFORMER_QUESTIONS);
                    setAiStatusMessage("✓ Loaded 10 standard Transformer Safety exam questions.");
                  }}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] shrink-0 transition-all"
                >
                  Load Standard Set
                </button>
              </div>
            )}

            {submitError && (
              <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-xs font-semibold text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleSaveTraining()}
              disabled={saving}
              className="w-full py-4 px-4 bg-gradient-to-r from-blue-600 via-blue-500 to-amber-500 hover:from-blue-500 hover:to-amber-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer active:scale-[0.99]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Generating Training & Loading Answer Key Review...</span>
                </>
              ) : (
                <>
                  <span>Proceed to Question Answer Key Review</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </GlassCard>
        </div>
      </form>

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
    </div>
  );
};
