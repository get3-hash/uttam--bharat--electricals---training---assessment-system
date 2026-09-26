import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, SendOtpResult } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { HeaderBranding } from "../components/HeaderBranding";
import { GlassCard } from "../components/GlassCard";
import { CompanyLogo } from "../components/CompanyLogo";
import {
  Lock,
  Mail,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Smartphone,
  Send,
  KeyRound,
  RotateCcw
} from "lucide-react";

export const AdminLogin: React.FC = () => {
  const { theme } = useTheme();
  const {
    loginAdmin,
    generateAndSendOtp,
    loginWithOtp,
    sendAdminPasswordReset,
    resetAdminPasswordWithOldPassword,
    registeredEmail
  } = useAuth();
  const navigate = useNavigate();

  // Mode: "password" | "otp"
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");

  // Password Login State
  const [email, setEmail] = useState(() => registeredEmail || "admin@uttambharat.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // OTP Login State
  const [otpEmail, setOtpEmail] = useState(() => registeredEmail || "admin@uttambharat.com");
  const [otpCode, setOtpCode] = useState("");
  const [generatedOtpCode, setGeneratedOtpCode] = useState("");
  const [otpInfo, setOtpInfo] = useState<SendOtpResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [wantsNewPassword, setWantsNewPassword] = useState(false);
  const [otpNewPassword, setOtpNewPassword] = useState("");
  const [showOtpNewPassword, setShowOtpNewPassword] = useState(false);

  // Sync registered email if changed
  useEffect(() => {
    if (registeredEmail) {
      setEmail(registeredEmail);
      setOtpEmail(registeredEmail);
    }
  }, [registeredEmail]);

  // Forgot password modal state (for alternative legacy recovery)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetTab, setResetTab] = useState<"otp" | "oldPassword" | "email">("otp");
  const [resetEmail, setResetEmail] = useState(() => registeredEmail || "admin@uttambharat.com");
  const [resetOldPassword, setResetOldPassword] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetOldPassword, setShowResetOldPassword] = useState(false);
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  // Handler: Standard Password Login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      await loginAdmin(email, password);
      navigate("/admin/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid email/username or password.");
    } finally {
      setLoading(false);
    }
  };

  // Handler: Send OTP for Login
  const handleSendOtp = async (targetEmail?: string) => {
    const emailToSend = (targetEmail || otpEmail).trim();
    if (!emailToSend) {
      setOtpError("Please enter your registered admin email address.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");
    setOtpSuccess("");

    try {
      const result = await generateAndSendOtp(emailToSend);
      setOtpInfo(result);
      if (result.fallbackOtp) {
        setGeneratedOtpCode(result.fallbackOtp);
      } else {
        setGeneratedOtpCode("");
      }
      setOtpSent(true);
      setOtpSuccess(result.message);
    } catch (err: any) {
      console.error(err);
      setOtpError(err.message || "Failed to generate OTP. Please verify your email.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Handler: Verify OTP and Login directly
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError("Please enter the complete 6-digit OTP code.");
      return;
    }

    if (wantsNewPassword && otpNewPassword && otpNewPassword.length < 6) {
      setOtpError("New password must be at least 6 characters long.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");
    setOtpSuccess("");

    try {
      await loginWithOtp(otpEmail, otpCode, wantsNewPassword ? otpNewPassword : undefined);
      setOtpSuccess("OTP verified successfully! Logging into Admin Portal...");
      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 500);
    } catch (err: any) {
      console.error(err);
      setOtpError(err.message || "Invalid or expired OTP code. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Handler: Switch directly to OTP Login when "Forgot Password" is clicked
  const switchToOtpLogin = () => {
    setLoginMode("otp");
    setOtpEmail(email || "admin@uttambharat.com");
    setError("");
    setSuccessMsg("");
    setOtpError("");
    setOtpSuccess("");
    // Automatically trigger OTP generation for instant convenience
    handleSendOtp(email || "admin@uttambharat.com");
  };

  // Handler: Modal Reset with Old Password
  const handleForgotPasswordWithOld = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    if (!resetOldPassword) {
      setResetError("Please enter your current old password.");
      return;
    }
    if (!resetNewPassword) {
      setResetError("Please enter a new password.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("New passwords do not match.");
      return;
    }
    if (resetNewPassword.length < 6) {
      setResetError("New password must be at least 6 characters long.");
      return;
    }

    setResetLoading(true);
    try {
      await resetAdminPasswordWithOldPassword(resetEmail, resetOldPassword, resetNewPassword);
      setResetSuccess("Password updated successfully! You can now sign in with your new password.");
      setResetOldPassword("");
      setResetNewPassword("");
      setResetConfirmPassword("");
    } catch (err: any) {
      setResetError(err.message || "Old password is incorrect.");
    } finally {
      setResetLoading(false);
    }
  };

  // Handler: Modal Reset via Email Link
  const handleForgotPasswordEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");
    setResetSuccess("");

    try {
      await sendAdminPasswordReset(resetEmail);
      setResetSuccess("Password reset instructions have been sent to " + resetEmail);
    } catch (err: any) {
      setResetError(err.message || "Registered admin email not found.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between text-slate-900 dark:text-slate-100 transition-colors">
      <HeaderBranding subtitle="Authorized Quality & Management Personnel Portal" />

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          <GlassCard className="p-8 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl relative overflow-hidden">
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600" />

            {/* Brand Logo & Title Header */}
            <div className="text-center mb-6">
              <div className="bg-slate-50 dark:bg-slate-800/90 p-3.5 rounded-2xl shadow-xs dark:shadow-xl border border-slate-200 dark:border-slate-700/50 inline-block mb-3 max-w-[240px]">
                <CompanyLogo variant="full" darkBg={theme === "dark"} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Management Admin Portal</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Uttam (Bharat) Electricals Pvt. Ltd.
              </p>
            </div>

            {/* Login Mode Selection Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 mb-6">
              <button
                type="button"
                onClick={() => {
                  setLoginMode("password");
                  setError("");
                  setSuccessMsg("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  loginMode === "password"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-current" />
                Password Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode("otp");
                  setOtpEmail(email || "admin@uttambharat.com");
                  setError("");
                  setSuccessMsg("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  loginMode === "otp"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-current" />
                Login via OTP
              </button>
            </div>

            {/* MODE 1: PASSWORD LOGIN */}
            {loginMode === "password" && (
              <>
                {error && (
                  <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-200 text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                      Email or Username
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-blue-500 dark:text-blue-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@uttambharat.com or username"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={switchToOtpLogin}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors underline-offset-2 hover:underline"
                      >
                        Forgot Password? (Login with OTP)
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-blue-500 dark:text-blue-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 tracking-wide font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2.5 top-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        title={showPassword ? "Hide password" : "Show password"}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                        ) : (
                          <Eye className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.99] mt-2"
                  >
                    {loading ? "Authenticating..." : "Sign In to Admin Portal"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}

            {/* MODE 2: OTP LOGIN (FORGOT PASSWORD ACCESS) */}
            {loginMode === "otp" && (
              <div className="space-y-4">
                {otpError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{otpError}</span>
                  </div>
                )}

                {/* OTP Sent Notice Card */}
                {/* OTP Sent Notice Card */}
                {otpSent && (
                  <div className="space-y-3">
                    {otpInfo?.emailSent ? (
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/50 text-emerald-900 dark:text-emerald-100 text-xs space-y-2 shadow-lg">
                        <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          OTP Dispatched in Real-Time to Email Inbox!
                        </div>
                        <p className="text-slate-700 dark:text-slate-200">
                          A 6-digit one-time password was sent in real-time to <span className="font-bold text-slate-900 dark:text-white underline">{otpEmail}</span>. Please check your inbox (or spam folder) and enter it below.
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-300/90 bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-500/30">
                          <span>✉️ Valid for 10 minutes. Delivered in real-time via {otpInfo?.provider || "Email API"}.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-500/40 text-blue-900 dark:text-blue-100 text-xs space-y-2 shadow-xs">
                        <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-300 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          OTP Generated for Direct Access
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          Recipient: <span className="font-semibold text-slate-900 dark:text-white">{otpEmail}</span>
                        </p>
                        {generatedOtpCode && (
                          <div className="flex items-center justify-between bg-white dark:bg-slate-900/90 px-3.5 py-2.5 rounded-lg border border-blue-200 dark:border-blue-500/40 shadow-xs">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Your Login OTP:</span>
                            <span className="font-mono font-black text-lg text-blue-600 dark:text-blue-400 tracking-[0.25em]">
                              {generatedOtpCode}
                            </span>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          Valid for 10 minutes. To deliver directly to your personal inbox in real-time, configure <code className="font-semibold text-blue-700 dark:text-blue-300">RESEND_API_KEY</code>, <code className="font-semibold text-blue-700 dark:text-blue-300">BREVO_API_KEY</code>, or <code className="font-semibold text-blue-700 dark:text-blue-300">GMAIL_APP_PASSWORD</code> in Settings.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 1: Request OTP if not sent yet */}
                {!otpSent ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendOtp();
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                        Recipient Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-blue-500 dark:text-blue-400 absolute left-3.5 top-3" />
                        <input
                          type="email"
                          required
                          value={otpEmail}
                          onChange={(e) => setOtpEmail(e.target.value)}
                          placeholder="yourname@gmail.com"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                        Enter your real email address (e.g. Gmail / Outlook) to receive your real-time 6-digit verification code.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={otpLoading}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {otpLoading ? "Generating & Sending OTP..." : "Send Login OTP"}
                    </button>
                  </form>
                ) : (
                  /* Step 2: Enter OTP & Verify */
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Enter 6-Digit OTP Code
                        </label>
                        <button
                          type="button"
                          onClick={() => handleSendOtp()}
                          disabled={otpLoading}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Resend OTP
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="• • • • • •"
                        className="w-full bg-white dark:bg-slate-900 border-2 border-blue-500/50 rounded-xl py-3 text-center text-2xl font-mono tracking-[0.4em] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-bold"
                      />
                    </div>

                    {/* Optional: Set New Password while logging in */}
                    <div className="pt-1 border-t border-slate-800">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wantsNewPassword}
                          onChange={(e) => setWantsNewPassword(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500"
                        />
                        <span>Also update my password now (Optional)</span>
                      </label>

                      {wantsNewPassword && (
                        <div className="mt-3 relative">
                          <Lock className="w-4 h-4 text-blue-400 absolute left-3.5 top-3" />
                          <input
                            type={showOtpNewPassword ? "text" : "password"}
                            value={otpNewPassword}
                            onChange={(e) => setOtpNewPassword(e.target.value)}
                            placeholder="Enter new password (min. 6 chars)"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-11 py-2 text-sm text-white focus:outline-none focus:border-blue-400 transition-all placeholder:text-slate-400 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOtpNewPassword((prev) => !prev)}
                            className="absolute right-2.5 top-1.5 p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                          >
                            {showOtpNewPassword ? (
                              <EyeOff className="w-3.5 h-3.5 text-slate-300" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-slate-300" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={otpLoading || otpCode.length !== 6}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.99]"
                    >
                      {otpLoading ? "Verifying OTP..." : "Verify OTP & Sign In"}
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode("");
                        setGeneratedOtpCode("");
                        setOtpError("");
                      }}
                      className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      ← Change Email Address
                    </button>
                  </form>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      </main>

      {/* Legacy Forgot Password Modal (for Old Password or Email Reset Link) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative text-slate-900 dark:text-white">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Password Recovery</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              Choose an authentication method to access or reset your account.
            </p>

            {/* Reset Method Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 mb-4">
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  switchToOtpLogin();
                }}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow"
              >
                Instant OTP Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetTab("oldPassword");
                  setResetError("");
                  setResetSuccess("");
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  resetTab === "oldPassword"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Reset with Old Pass
              </button>
            </div>

            {resetError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                <span>{resetSuccess}</span>
              </div>
            )}

            {resetTab === "oldPassword" ? (
              <form onSubmit={handleForgotPasswordWithOld} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Registered Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-blue-500 dark:text-blue-400 absolute left-3.5 top-2.5" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@uttambharat.com"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Old Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-blue-500 dark:text-blue-400 absolute left-3.5 top-2.5" />
                    <input
                      type={showResetOldPassword ? "text" : "password"}
                      required
                      value={resetOldPassword}
                      onChange={(e) => setResetOldPassword(e.target.value)}
                      placeholder="Enter your current old password"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetOldPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                    >
                      {showResetOldPassword ? (
                        <EyeOff className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-blue-500 dark:text-blue-400 absolute left-3.5 top-2.5" />
                    <input
                      type={showResetNewPassword ? "text" : "password"}
                      required
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 characters)"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                    >
                      {showResetNewPassword ? (
                        <EyeOff className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-blue-500 dark:text-blue-400 absolute left-3.5 top-2.5" />
                    <input
                      type={showResetConfirmPassword ? "text" : "password"}
                      required
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                    >
                      {showResetConfirmPassword ? (
                        <EyeOff className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {resetLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotPasswordEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Registered Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-blue-500 dark:text-blue-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@uttambharat.com"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {resetLoading ? "Sending Link..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
