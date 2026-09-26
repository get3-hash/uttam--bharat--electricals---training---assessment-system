export interface Question {
  id: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctOption: number | null; // 0, 1, 2, 3 or null if pending selection
}

export interface Training {
  id: string;
  title: string;
  department: string;
  trainerName: string;
  trainingDate: string;
  description: string;
  passingPercentage: number;
  timeLimitMinutes: number;
  folderName?: string;
  trainingPdfUrl?: string;
  questionPdfUrl?: string;
  qrCodeDataUrl?: string;
  questions: Question[];
  isAnswerKeyComplete: boolean;
  createdAt: string;
  createdBy: string;
}

export interface EmployeeRegistration {
  id: string;
  trainingId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  email: string;
  phone: string;
  trainingTitle: string;
  trainerName: string;
  trainingDate: string;
  registeredAt: string;
}

export interface FeedbackRatings {
  expectationCovered: number; // 1. Did this Training Session cover the topic/subject as per your expectation?
  trainingAidsQuality: number; // 2. How were the quality of slides/videos/audios/training aids?
  trainerEffectiveness: number; // 3. How was the trainer's efforts and effectiveness in presenting the session?
  trainerInvolvement: number; // 4. How was the efforts of the trainer in involving everyone into the session?
  trainerAnsweringQuestions: number; // 5. How well did the trainer invite & answer the questions from the trainees?

  // Backwards compatibility for older documents
  objectivesCovered?: number;
  trainerKnowledge?: number;
  presentationDelivery?: number;
  communicationClarity?: number;
  interactionQa?: number;
  practicalSession?: number;
  trainingMaterial?: number;
  overallExperience?: number;
}

export interface TrainingFeedback {
  id: string;
  registrationId: string;
  trainingId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  ratings: FeedbackRatings;
  learnings?: [string, string, string];
  applicationTimeline?: string;
  suggestions?: string;
  submittedAt: string;
}

export interface QuizAttempt {
  id: string;
  registrationId: string;
  trainingId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  percentage: number;
  passed: boolean;
  userAnswers: Record<number, number>; // index -> selectedOption
  attemptTimeSeconds: number;
  tabSwitches: number;
  certificateId?: string;
  submittedAt: string;
}

export interface DashboardMetrics {
  totalEmployees: number;
  totalTrainings: number;
  totalQuestions: number;
  feedbackReportsCount: number;
  passPercentage: number;
  departmentAnalytics: Record<string, { total: number; passed: number; avgFeedback: number }>;
}

export type AdminRole = "super_admin" | "admin";
export type AdminStatus = "active" | "inactive";

export interface AdminAccount {
  id: string;
  name: string;
  email: string; // Also serves as username/identifier
  username?: string;
  role: AdminRole;
  roleTitle?: string; // Custom role designation, e.g. "Quality & Management Admin", "Super Admin", "Training Head"
  status: AdminStatus;
  createdAt: string;
  updatedAt?: string;
}

