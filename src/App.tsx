import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { GoogleSheetsAutoSyncProvider } from "./context/GoogleSheetsAutoSyncContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";

// Pages
import { AdminLogin } from "./pages/AdminLogin";
import { AdminDashboard } from "./pages/AdminDashboard";
import { TrainingsList } from "./pages/TrainingsList";
import { CreateTraining } from "./pages/CreateTraining";
import { QuestionReview } from "./pages/QuestionReview";
import { EmployeePortal } from "./pages/EmployeePortal";
import { FeedbackForm } from "./pages/FeedbackForm";
import { SectionBActionPlan } from "./pages/SectionBActionPlan";
import { QuizAssessment } from "./pages/QuizAssessment";
import { CertificateView } from "./pages/CertificateView";
import { ReportsHub } from "./pages/ReportsHub";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AdminSettings } from "./pages/AdminSettings";

// Protected Admin Route wrapper
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center text-sm font-medium">
        Authenticating...
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const { isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors">
      <Navbar />

      <div className="flex-1">
        <Routes>
          {/* Root Redirect */}
          <Route
            path="/"
            element={isAdmin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/login" replace />}
          />

          {/* Admin Routes */}
          <Route path="/login" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/trainings"
            element={
              <AdminRoute>
                <TrainingsList />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/create-training"
            element={
              <AdminRoute>
                <CreateTraining />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/review-questions/:trainingId"
            element={
              <AdminRoute>
                <QuestionReview />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <AdminRoute>
                <ReportsHub />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <AdminRoute>
                <AnalyticsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AdminRoute>
                <AdminSettings />
              </AdminRoute>
            }
          />

          {/* Employee Routes (NO LOGIN REQUIRED) */}
          <Route path="/employee/register/:trainingId" element={<EmployeePortal />} />
          <Route path="/employee/register" element={<EmployeePortal />} />
          <Route path="/employee/feedback/:registrationId" element={<FeedbackForm />} />
          <Route path="/employee/feedback" element={<FeedbackForm />} />
          <Route path="/employee/section-b/:registrationId" element={<SectionBActionPlan />} />
          <Route path="/employee/section-b" element={<SectionBActionPlan />} />
          <Route path="/employee/quiz/:registrationId" element={<QuizAssessment />} />
          <Route path="/employee/quiz" element={<QuizAssessment />} />
          <Route path="/employee/certificate/:attemptId" element={<CertificateView />} />
          <Route path="/employee/certificate" element={<CertificateView />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <GoogleSheetsAutoSyncProvider>
            <AppContent />
          </GoogleSheetsAutoSyncProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
