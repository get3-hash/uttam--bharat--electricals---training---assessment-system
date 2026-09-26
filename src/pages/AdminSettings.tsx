import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { GlassCard } from "../components/GlassCard";
import {
  Shield,
  Lock,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  User,
  ShieldCheck,
  Building,
  Sun,
  Moon,
  Palette,
  Check,
  Sparkles,
  Eye,
  EyeOff,
  Server,
  Zap,
  Trash2,
  Globe,
  RefreshCw,
  Key,
  FileSpreadsheet,
  Users
} from "lucide-react";
import { soundEffects } from "../lib/soundEffects";
import { GoogleSheetsSyncSettings } from "../components/GoogleSheetsSyncSettings";
import { AdminManagement } from "../components/AdminManagement";

export const AdminSettings: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { currentUser, currentAdmin, isSuperAdmin, changeAdminPassword, changeAdminEmail, registeredEmail } = useAuth();
  const { theme, setTheme, toggleTheme } = useTheme();

  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam === "admins" || tabParam === "users"
      ? "admins"
      : tabParam === "security"
      ? "security"
      : tabParam === "preferences"
      ? "preferences"
      : tabParam === "profile"
      ? "profile"
      : "googlesheets";
  const [activeTab, setActiveTab] = useState<"security" | "preferences" | "profile" | "googlesheets" | "admins">(initialTab);

  // Change Password Form State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Change Email Form State
  const [newEmail, setNewEmail] = useState("");
  const [emailConfirmPass, setEmailConfirmPass] = useState("");
  const [showEmailConfirmPass, setShowEmailConfirmPass] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  // Real-Time Email API Status
  const [smtpStatus, setSmtpStatus] = useState<{
    isConfigured: boolean;
    configuredEmail: string | null;
    provider: string;
    source?: "runtime" | "env";
    runtimeConfig?: any;
    supportedApis?: Array<{ name: string; envVar: string; speed: string; note: string }>;
  } | null>(null);

  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Email API Configuration Form State
  const [emailProvider, setEmailProvider] = useState<"resend" | "brevo" | "gmail" | "smtp" | "webhook">("resend");
  const [resendKey, setResendKey] = useState("");
  const [resendFrom, setResendFrom] = useState("Uttam Bharat Portal <onboarding@resend.dev>");
  const [brevoKey, setBrevoKey] = useState("");
  const [brevoSender, setBrevoSender] = useState("");
  const [gmailUser, setGmailUser] = useState("");
  const [gmailPass, setGmailPass] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingEmailConfig, setSavingEmailConfig] = useState(false);
  const [deletingConfig, setDeletingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ success: boolean; message: string } | null>(null);

  const refreshEmailStatus = () => {
    fetch("/api/email-config-status")
      .then((res) => res.json())
      .then((data) => {
        setSmtpStatus(data);
        if (data.runtimeConfig) {
          if (data.runtimeConfig.provider) setEmailProvider(data.runtimeConfig.provider);
          if (data.runtimeConfig.resendFrom) setResendFrom(data.runtimeConfig.resendFrom);
          if (data.runtimeConfig.brevoSenderEmail) setBrevoSender(data.runtimeConfig.brevoSenderEmail);
          if (data.runtimeConfig.gmailUser) setGmailUser(data.runtimeConfig.gmailUser);
          if (data.runtimeConfig.smtpHost) setSmtpHost(data.runtimeConfig.smtpHost);
          if (data.runtimeConfig.smtpPort) setSmtpPort(String(data.runtimeConfig.smtpPort));
          if (data.runtimeConfig.smtpSecure !== undefined) setSmtpSecure(data.runtimeConfig.smtpSecure);
          if (data.runtimeConfig.smtpUser) setSmtpUser(data.runtimeConfig.smtpUser);
          if (data.runtimeConfig.smtpFrom) setSmtpFrom(data.runtimeConfig.smtpFrom);
          if (data.runtimeConfig.webhookUrl) setWebhookUrl(data.runtimeConfig.webhookUrl);
        }
      })
      .catch((err) => console.warn("Could not fetch email API status:", err));
  };

  useEffect(() => {
    refreshEmailStatus();
  }, []);

  const handleTestEmailDispatch = async () => {
    soundEffects.playTouchTap();
    const target = registeredEmail || "admin@uttambharat.com";
    setTestingEmail(true);
    setTestEmailFeedback(null);

    try {
      const res = await fetch("/api/test-email-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to dispatch test email.");
      }
      soundEffects.playSuccessJingle();
      setTestEmailFeedback({ success: true, message: data.message });
      refreshEmailStatus();
    } catch (err: any) {
      soundEffects.playWarningAlert();
      setTestEmailFeedback({ success: false, message: err.message || "Failed to dispatch test email." });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEffects.playTouchTap();
    setSavingEmailConfig(true);
    setConfigMessage(null);

    try {
      const payload: any = { provider: emailProvider };
      if (emailProvider === "resend") {
        payload.resendApiKey = resendKey;
        payload.resendFrom = resendFrom;
      } else if (emailProvider === "brevo") {
        payload.brevoApiKey = brevoKey;
        payload.brevoSenderEmail = brevoSender;
      } else if (emailProvider === "gmail") {
        payload.gmailUser = gmailUser;
        payload.gmailAppPassword = gmailPass;
      } else if (emailProvider === "smtp") {
        payload.smtpHost = smtpHost;
        payload.smtpPort = smtpPort;
        payload.smtpSecure = smtpSecure;
        payload.smtpUser = smtpUser;
        payload.smtpPass = smtpPass;
        payload.smtpFrom = smtpFrom;
      } else if (emailProvider === "webhook") {
        payload.webhookUrl = webhookUrl;
      }

      const res = await fetch("/api/save-email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save email API configuration.");
      }

      soundEffects.playOptionSelect();
      setConfigMessage({ success: true, message: data.message });
      refreshEmailStatus();
    } catch (err: any) {
      soundEffects.playWarningAlert();
      setConfigMessage({ success: false, message: err.message || "Failed to save configuration." });
    } finally {
      setSavingEmailConfig(false);
    }
  };

  const handleDeleteEmailConfig = async () => {
    soundEffects.playTouchTap();
    setDeletingConfig(true);
    setConfigMessage(null);
    try {
      const res = await fetch("/api/delete-email-config", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete email configuration.");
      soundEffects.playOptionSelect();
      setConfigMessage({ success: true, message: data.message });
      refreshEmailStatus();
    } catch (err: any) {
      soundEffects.playWarningAlert();
      setConfigMessage({ success: false, message: err.message || "Failed to remove configuration." });
    } finally {
      setDeletingConfig(false);
    }
  };

  const handleChangeEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");

    if (!newEmail || !newEmail.trim() || !newEmail.includes("@")) {
      setEmailError("Please enter a valid new email address.");
      return;
    }

    if (!emailConfirmPass) {
      setEmailError("Please enter your current administrator password to authorize this email change.");
      return;
    }

    setUpdatingEmail(true);
    try {
      await changeAdminEmail(newEmail.trim(), emailConfirmPass);
      setEmailSuccess(`Admin email successfully changed to ${newEmail.trim()}! Active administrator email has been updated.`);
      setNewEmail("");
      setEmailConfirmPass("");
    } catch (err: any) {
      console.error("Change email error:", err);
      setEmailError(err.message || "Failed to update admin email address.");
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Form Validations
    if (!oldPassword) {
      setErrorMessage("Please enter your old password.");
      return;
    }

    if (!newPassword) {
      setErrorMessage("Please enter a new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }

    setUpdating(true);

    try {
      await changeAdminPassword(oldPassword, newPassword);
      setSuccessMessage("Password changed successfully! Please use your new password for subsequent logins.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Change password error:", err);
      setErrorMessage(err.message || "Old password is incorrect.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Page Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm dark:shadow-xl">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-500/20">
            Admin Profile & Settings
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Account Security & Settings
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Uttam (Bharat) Electricals Pvt. Ltd. • Manage Admin Profile & Security
          </p>
        </div>
        <div className="text-left md:text-right">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Logged in as:</span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">{currentUser?.email || "admin@uttambharat.com"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <GlassCard className="p-2 space-y-1">
            <button
              onClick={() => {
                soundEffects.playTouchTap();
                setActiveTab("googlesheets");
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
                activeTab === "googlesheets"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/25"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <FileSpreadsheet
                className={`w-4 h-4 shrink-0 ${
                  activeTab === "googlesheets" ? "text-white" : "text-emerald-600 dark:text-emerald-400"
                }`}
              />
              <div className="flex flex-col">
                <span className="font-bold flex items-center gap-1.5">
                  Google Sheets Sync
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </span>
                <span className="text-[10px] opacity-85">Live Sheet & Dept-wise</span>
              </div>
            </button>

            <button
              onClick={() => {
                soundEffects.playTouchTap();
                setActiveTab("preferences");
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
                activeTab === "preferences"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>User Preferences & Theme</span>
            </button>

            <button
              onClick={() => {
                soundEffects.playTouchTap();
                setActiveTab("security");
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
                activeTab === "security"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Security & Password</span>
            </button>

            <button
              onClick={() => {
                soundEffects.playTouchTap();
                setActiveTab("profile");
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
                activeTab === "profile"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <User className="w-4 h-4" />
              <span>General Profile</span>
            </button>

            <button
              onClick={() => {
                soundEffects.playTouchTap();
                setActiveTab("admins");
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
                activeTab === "admins"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Admin Accounts & Roles</span>
            </button>
          </GlassCard>
        </div>

        {/* Main Content Pane */}
        <div className="lg:col-span-3">
          {activeTab === "admins" && <AdminManagement />}

          {activeTab === "googlesheets" && <GoogleSheetsSyncSettings />}

          {activeTab === "preferences" && (
            <GlassCard className="p-6 sm:p-8 space-y-8">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-500/20">
                  User Interface Preferences
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Global Visual Theme
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Customize your workspace appearance. Theme selection persists automatically across all admin and employee pages.
                </p>
              </div>

              {/* Theme Toggle Cards */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Select Theme Mode
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dark Theme Card */}
                  <div
                    onClick={() => setTheme("dark")}
                    className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 relative overflow-hidden ${
                      theme === "dark"
                        ? "bg-slate-900 border-blue-500 ring-2 ring-blue-500/30 shadow-xl"
                        : "bg-white dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-90 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center border border-slate-700">
                          <Moon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dark Theme</h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Deep slate canvas & high contrast</p>
                        </div>
                      </div>
                      {theme === "dark" && (
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    {/* Preview Box */}
                    <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <div className="h-2.5 w-16 bg-slate-800 rounded"></div>
                        <div className="h-2 w-8 bg-blue-500/40 rounded"></div>
                      </div>
                      <div className="h-2 w-full bg-slate-800/80 rounded"></div>
                      <div className="h-2 w-3/4 bg-slate-800/50 rounded"></div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Default System Aesthetic</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTheme("dark");
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          theme === "dark"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {theme === "dark" ? "Active" : "Switch"}
                      </button>
                    </div>
                  </div>

                  {/* Light Theme Card */}
                  <div
                    onClick={() => setTheme("light")}
                    className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 relative overflow-hidden ${
                      theme === "light"
                        ? "bg-blue-50/70 dark:bg-slate-900 border-blue-500 ring-2 ring-blue-500/30 shadow-md"
                        : "bg-white dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-90 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/30">
                          <Sun className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Light Theme</h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Clean white canvas & crisp typography</p>
                        </div>
                      </div>
                      {theme === "light" && (
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    {/* Preview Box */}
                    <div className="bg-slate-100 rounded-xl p-3 border border-slate-200 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <div className="h-2.5 w-16 bg-slate-300 rounded"></div>
                        <div className="h-2 w-8 bg-blue-600/40 rounded"></div>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded"></div>
                      <div className="h-2 w-3/4 bg-slate-200 rounded"></div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Bright High-Readability Mode</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTheme("light");
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          theme === "light"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {theme === "light" ? "Active" : "Switch"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Toggle Switch Bar */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Quick Theme Switcher</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Toggle mode instantly without losing work or active state.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white transition-all flex items-center gap-2 shadow-xs"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-500" /> Switch to Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Switch to Dark Mode
                    </>
                  )}
                </button>
              </div>
            </GlassCard>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              {/* SECTION 1: CHANGE ADMIN EMAIL ADDRESS */}
              <GlassCard className="p-6 sm:p-8 space-y-6">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Admin Email Configuration
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Manage the authorized administrator email. Only this email can sign in and receive login OTPs.
                      </p>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Active: {registeredEmail || "admin@uttambharat.com"}
                    </div>
                  </div>
                </div>

                {/* Email Change Feedback */}
                {emailError && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 dark:text-rose-400" />
                    <span className="font-medium">{emailError}</span>
                  </div>
                )}

                {emailSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium">{emailSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleChangeEmailSubmit} className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      New Administrator Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="e.g. yourname@gmail.com or admin@uttambharat.com"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Authorize with Current Admin Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showEmailConfirmPass ? "text" : "password"}
                        required
                        value={emailConfirmPass}
                        onChange={(e) => setEmailConfirmPass(e.target.value)}
                        placeholder="Enter current password to confirm"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmailConfirmPass((prev) => !prev)}
                        className="absolute right-2.5 top-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                        title={showEmailConfirmPass ? "Hide password" : "Show password"}
                        aria-label={showEmailConfirmPass ? "Hide password" : "Show password"}
                      >
                        {showEmailConfirmPass ? (
                          <EyeOff className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingEmail}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-md shadow-blue-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {updatingEmail ? "Updating Email..." : "Update Admin Email"}
                  </button>
                </form>
              </GlassCard>

              {/* SECTION 2: REAL-TIME EMAIL API STATUS & CONFIGURATION */}
              <GlassCard className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Send className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Real-Time Email OTP API
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Direct HTTP API and SMTP dispatch engine for delivering login OTPs directly to inbox in real-time.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {smtpStatus?.isConfigured ? (
                      <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 shadow-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                        Active: {smtpStatus.provider}
                      </span>
                    ) : (
                      <span className="px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        No API Key Configured (Session Fallback)
                      </span>
                    )}
                  </div>
                </div>

                {/* Configuration / Action Notification Messages */}
                {configMessage && (
                  <div
                    className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
                      configMessage.success
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                        : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    {configMessage.success ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                    )}
                    <span className="font-medium">{configMessage.message}</span>
                  </div>
                )}

                {/* Test Email Feedback */}
                {testEmailFeedback && (
                  <div
                    className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
                      testEmailFeedback.success
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                        : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    {testEmailFeedback.success ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                    )}
                    <span className="font-medium">{testEmailFeedback.message}</span>
                  </div>
                )}

                {/* Provider Selection Tabs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" /> Choose Email API Provider to Connect:
                    </span>
                    <button
                      type="button"
                      onClick={handleTestEmailDispatch}
                      disabled={testingEmail}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {testingEmail ? "Dispatching..." : `Send Test OTP to ${registeredEmail || "Admin"}`}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTouchTap();
                        setEmailProvider("resend");
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
                        emailProvider === "resend"
                          ? "bg-blue-50 dark:bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs ring-1 ring-blue-500"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">Resend API</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                          Fastest
                        </span>
                      </div>
                      <p className="text-[10px] opacity-75">Instant HTTP API (free at resend.com)</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTouchTap();
                        setEmailProvider("brevo");
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
                        emailProvider === "brevo"
                          ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">Brevo API</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                          300/day
                        </span>
                      </div>
                      <p className="text-[10px] opacity-75">Sendinblue API (free at brevo.com)</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTouchTap();
                        setEmailProvider("gmail");
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
                        emailProvider === "gmail"
                          ? "bg-amber-50 dark:bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300 shadow-xs ring-1 ring-amber-500"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">Gmail SMTP</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                          Direct
                        </span>
                      </div>
                      <p className="text-[10px] opacity-75">Gmail address + App Password</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTouchTap();
                        setEmailProvider("smtp");
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
                        emailProvider === "smtp"
                          ? "bg-purple-50 dark:bg-purple-500/15 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs ring-1 ring-purple-500"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">Custom SMTP</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                          Custom
                        </span>
                      </div>
                      <p className="text-[10px] opacity-75">Corporate / Hostinger / cPanel</p>
                    </button>
                  </div>
                </div>

                {/* Interactive API Credentials Configuration Form */}
                <form onSubmit={handleSaveEmailConfig} className="bg-slate-50 dark:bg-slate-950/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  {emailProvider === "resend" && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Resend API Key (starts with <code className="text-blue-600 dark:text-blue-400">re_</code>)
                          </label>
                          <a
                            href="https://resend.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            Get free key at resend.com <Globe className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="relative">
                          <Key className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                          <input
                            type={showApiKey ? "text" : "password"}
                            required
                            value={resendKey}
                            onChange={(e) => setResendKey(e.target.value)}
                            placeholder="re_123456789_abcdef..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey((prev) => !prev)}
                            className="absolute right-2.5 top-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                            title={showApiKey ? "Hide key" : "Show key"}
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Sender Address (Optional, default: onboarding@resend.dev)
                        </label>
                        <input
                          type="text"
                          value={resendFrom}
                          onChange={(e) => setResendFrom(e.target.value)}
                          placeholder="Uttam Bharat Portal <onboarding@resend.dev>"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all shadow-xs"
                        />
                      </div>
                    </div>
                  )}

                  {emailProvider === "brevo" && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Brevo (Sendinblue) v3 API Key
                          </label>
                          <a
                            href="https://app.brevo.com/settings/keys/api"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            Get free key at brevo.com <Globe className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="relative">
                          <Key className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                          <input
                            type={showApiKey ? "text" : "password"}
                            required
                            value={brevoKey}
                            onChange={(e) => setBrevoKey(e.target.value)}
                            placeholder="xkeysib-..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey((prev) => !prev)}
                            className="absolute right-2.5 top-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Verified Sender Email in Brevo
                        </label>
                        <input
                          type="email"
                          value={brevoSender}
                          onChange={(e) => setBrevoSender(e.target.value)}
                          placeholder="admin@uttambharat.com or your verified Brevo email"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-all shadow-xs"
                        />
                      </div>
                    </div>
                  )}

                  {emailProvider === "gmail" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Gmail Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                          <input
                            type="email"
                            required
                            value={gmailUser}
                            onChange={(e) => setGmailUser(e.target.value)}
                            placeholder="your-company@gmail.com"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition-all shadow-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            16-Character Google App Password (not your normal password)
                          </label>
                          <a
                            href="https://myaccount.google.com/apppasswords"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                          >
                            Generate App Password <Globe className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="relative">
                          <Key className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                          <input
                            type={showApiKey ? "text" : "password"}
                            required
                            value={gmailPass}
                            onChange={(e) => setGmailPass(e.target.value)}
                            placeholder="xxxx xxxx xxxx xxxx"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition-all shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey((prev) => !prev)}
                            className="absolute right-2.5 top-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Tip: Enable 2-Step Verification on your Google Account, then generate an App Password for Mail.
                        </p>
                      </div>
                    </div>
                  )}

                  {emailProvider === "smtp" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            SMTP Host
                          </label>
                          <input
                            type="text"
                            required
                            value={smtpHost}
                            onChange={(e) => setSmtpHost(e.target.value)}
                            placeholder="mail.yourdomain.com or smtp.gmail.com"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Port &amp; Security
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              required
                              value={smtpPort}
                              onChange={(e) => setSmtpPort(e.target.value)}
                              placeholder="465"
                              className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                soundEffects.playTouchTap();
                                setSmtpSecure((prev) => !prev);
                              }}
                              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                                smtpSecure
                                  ? "bg-purple-100 dark:bg-purple-900/40 border-purple-400 text-purple-800 dark:text-purple-300"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              SSL/TLS ({smtpSecure ? "SSL 465" : "STARTTLS 587"})
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            SMTP Username / Email
                          </label>
                          <input
                            type="text"
                            required
                            value={smtpUser}
                            onChange={(e) => setSmtpUser(e.target.value)}
                            placeholder="username@domain.com"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            SMTP Password
                          </label>
                          <div className="relative">
                            <input
                              type={showApiKey ? "text" : "password"}
                              required
                              value={smtpPass}
                              onChange={(e) => setSmtpPass(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-3 pr-10 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey((prev) => !prev)}
                              className="absolute right-2 top-1.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                            >
                              {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit & Reset Buttons */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={savingEmailConfig}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-600/30 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      {savingEmailConfig ? "Connecting..." : `Save & Connect ${emailProvider.toUpperCase()} API`}
                    </button>

                    {smtpStatus?.source === "runtime" && (
                      <button
                        type="button"
                        onClick={handleDeleteEmailConfig}
                        disabled={deletingConfig}
                        className="px-4 py-2 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deletingConfig ? "Removing..." : "Remove Saved API Config"}
                      </button>
                    )}
                  </div>
                </form>

                {/* Information Card about Environment Variables */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      Alternative: Permanent Cloud Secrets via AI Studio Settings
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    You can also declare these environment variables in the AI Studio Settings secrets panel:
                    <code className="mx-1 text-blue-600 dark:text-blue-400 font-semibold font-mono">RESEND_API_KEY</code>,
                    <code className="mx-1 text-emerald-600 dark:text-emerald-400 font-semibold font-mono">BREVO_API_KEY</code>,
                    or <code className="mx-1 text-amber-600 dark:text-amber-400 font-semibold font-mono">GMAIL_USER</code> &amp;
                    <code className="mx-1 text-amber-600 dark:text-amber-400 font-semibold font-mono">GMAIL_APP_PASSWORD</code>.
                  </p>
                </div>
              </GlassCard>

              {/* SECTION 3: CHANGE ADMIN PASSWORD */}
              <GlassCard className="p-6 sm:p-8 space-y-6">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-amber-500" /> Change Administrator Password
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Update your master access password for the Uttam (Bharat) Electricals Pvt. Ltd. portal.
                  </p>
                </div>

                {/* Password Error Notification */}
                {errorMessage && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 dark:text-rose-400" />
                    <span className="font-medium">{errorMessage}</span>
                  </div>
                )}

                {/* Password Success Notification */}
                {successMessage && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium">{successMessage}</span>
                  </div>
                )}

                <form onSubmit={handleChangePasswordSubmit} className="space-y-5 max-w-lg">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Old Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showOldPassword ? "text" : "password"}
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword((prev) => !prev)}
                        className="absolute right-2.5 top-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                        title={showOldPassword ? "Hide password" : "Show password"}
                        aria-label={showOldPassword ? "Hide password" : "Show password"}
                      >
                        {showOldPassword ? (
                          <EyeOff className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min. 6 characters)"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-2.5 top-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                        title={showNewPassword ? "Hide password" : "Show password"}
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-2.5 top-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={updating}
                      className="px-6 py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {updating ? "Verifying & Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </GlassCard>
            </div>
          )}

          {activeTab === "profile" && (
            <GlassCard className="p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Admin Profile Overview
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Uttam (Bharat) Electricals Pvt. Ltd. system administration details.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("admins")}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    {isSuperAdmin ? "Manage & Change Admin Roles →" : "View Admin Accounts →"}
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-w-lg text-sm text-slate-700 dark:text-slate-300">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Company:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">Uttam (Bharat) Electricals Pvt. Ltd.</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Admin Name:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{currentAdmin?.name || "Admin"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Admin Email:</span>
                    <span className="font-semibold text-slate-900 dark:text-white font-mono text-xs">{currentAdmin?.email || currentUser?.email || "admin@uttambharat.com"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Access Level:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isSuperAdmin
                        ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60"
                        : "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700/60"
                    }`}>
                      {isSuperAdmin ? "SUPER ADMIN" : "ADMIN"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Assigned Role Title:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {currentAdmin?.roleTitle || (isSuperAdmin ? "Super Admin" : "Quality & Management Admin")}
                      </span>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => setActiveTab("admins")}
                          className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 underline cursor-pointer"
                          title="Go to Admin Accounts & Roles to change role"
                        >
                          Change Role
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Role &amp; Permission Hierarchy
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Super Admins have master authority to create accounts, customize roles, and reassign permission tiers. Normal admins have operational access to assessments, quizzes, reports, and sync.
                  </p>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};
