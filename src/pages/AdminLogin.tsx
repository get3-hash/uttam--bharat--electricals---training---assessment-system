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

  // Forgot password modal state
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

  const handleSendOtp = async (targetEmail?: string) => {
    const emailToSend = (targetEmail || otpEmail).trim();
    if (!emailToSend || !emailToSend.includes("@")) {
      setOtpError("Please enter a valid email address to receive OTP.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");
    setOtpSuccess("");

    try {
      const res = await generateAndSendOtp(emailToSend);
      setOtpInfo(res);
      setGeneratedOtpCode(res.otp || res.fallbackOtp || "");
      setOtpSent(true);
      if (res.emailSent) {
        setOtpSuccess(`Real-time OTP delivered to ${emailToSend}! Please check your email inbox.`);
      } else {
        setOtpSuccess(`OTP generated for ${emailToSend}. You can also use the displayed code below.`);
      }
    } catch (err: any) {
      console.error("OTP send error:", err);
      setOtpError(err.message || "Failed to generate OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setOtpError("Please enter the full 6-digit verification code.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    try {
      await loginWithOtp(otpEmail, otpCode, wantsNewPassword && otpNewPassword ? otpNewPassword : undefined);
      navigate("/admin/dashboard");
    } catch (err: any) {
      console.error("OTP verify error:", err);
      setOtpError(err.message || "Invalid or expired OTP code.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleForgotPasswordWithOld = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    if (!resetOldPassword) {
      setResetError("Please enter your current old password.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("New passwords do not match.");
      return;
    }
    if (resetNewPassword.length < 6) {
      setResetError("New password must be at least 6 characters.");
      return;
    }

    setResetLoading(true);
    try {
      await resetAdminPasswordWithOldPassword(resetEmail, resetOldPassword, resetNewPassword);
      setResetSuccess("Password successfully updated! You can now log in.");
      setTimeout(() => {
        setShowForgotModal(false);
        setPassword(resetNewPassword);
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleForgotPasswordEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    if (!resetEmail || !resetEmail.includes("@")) {
      setResetError("Please enter a valid admin email address.");
      return;
    }

    setResetLoading(true);
    try {
      await sendAdminPasswordReset(resetEmail);
      setResetSuccess(`Password reset instructions dispatched to ${resetEmail}.`);
    } catch (err: any) {
      setResetError(err.message || "Failed to dispatch password reset.");
    } finally {
      setResetLoading(false);
    }
  };

  const switchToOtpLogin = () => {
    setLoginMode("otp");
    setOtpEmail(email || registeredEmail || "admin@uttambharat.com");
    setError("");
    setSuccessMsg("");
    if (!otpSent) {
      handleSendOtp(email || registeredEmail || "admin@uttambharat.com");
    }
  };

  return (
    <div className="min-h-screen bg-[#EAEAEA] text-[#403F3E] flex flex-col justify-between transition-colors">
      <HeaderBranding subtitle="Executive Administrator Access Portal" />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 my-6">
        <div className="w-full max-w-md">
          <GlassCard className="p-8 border border-[#D5D4D4] shadow-xs relative overflow-hidden bg-[#FFFFFF]">
            {/* Top accent bar: Approved Uttam Blue */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#008DD2]" />

            {/* Brand Logo & Title Header */}
            <div className="text-center mb-6">
              <div className="bg-[#FFFFFF] p-3 rounded-xl border border-[#D5D4D4] inline-block mb-3 max-w-[240px]">
                <CompanyLogo variant="full" darkBg={false} />
              </div>
              <h2 className="text-xl font-bold text-[#2B2A28] tracking-tight">Management Admin Portal</h2>
              <p className="text-xs text-[#757573] mt-1">
                Uttam (Bharat) Electricals Pvt. Ltd.
              </p>
            </div>

            {/* Login Mode Selection Tabs */}
            <div className="flex bg-[#EAEAEA] p-1.5 rounded-lg border border-[#D5D4D4] mb-6">
              <button
                type="button"
                onClick={() => {
                  setLoginMode("password");
                  setError("");
                  setSuccessMsg("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMode === "password"
                    ? "bg-[#008DD2] text-[#FFFFFF] shadow-xs"
                    : "text-[#403F3E] hover:text-[#2B2A28]"
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
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMode === "otp"
                    ? "bg-[#008DD2] text-[#FFFFFF] shadow-xs"
                    : "text-[#403F3E] hover:text-[#2B2A28]"
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
                  <div className="mb-5 p-3 rounded-lg bg-[#EAEAEA] border border-[#D5D4D4] text-[#2B2A28] text-xs flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-[#008DD2]" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="mb-5 p-3 rounded-lg bg-[#E6F4FA] border border-[#59B5E2] text-[#006393] text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#008DD2]" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#403F3E] mb-1.5">
                      Email or Username
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#757573] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@uttambharat.com or username"
                        className="w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#2B2A28] focus:outline-none focus:border-[#008DD2] focus:bg-[#E6F4FA] transition-colors placeholder:text-[#757573] font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-[#403F3E]">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={switchToOtpLogin}
                        className="text-xs font-semibold text-[#008DD2] hover:text-[#0078B2] transition-colors cursor-pointer"
                      >
                        Forgot Password? (Login with OTP)
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#757573] absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-lg pl-10 pr-11 py-2.5 text-sm text-[#2B2A28] focus:outline-none focus:border-[#008DD2] focus:bg-[#E6F4FA] transition-colors placeholder:text-[#757573] tracking-wide font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2.5 top-2 p-1.5 rounded text-[#757573] hover:text-[#2B2A28] transition-colors cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-[#757573]" />
                        ) : (
                          <Eye className="w-4 h-4 text-[#757573]" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-lg font-bold text-sm bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-[#FFFFFF] shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 cursor-pointer"
                  >
                    {loading ? "Authenticating..." : "Sign In to Admin Portal"}
                    <ArrowRight className="w-4 h-4 text-[#FFFFFF]" />
                  </button>
                </form>
              </>
            )}

            {/* MODE 2: OTP LOGIN */}
            {loginMode === "otp" && (
              <div className="space-y-4">
                {otpError && (
                  <div className="p-3 rounded-lg bg-[#EAEAEA] border border-[#D5D4D4] text-[#2B2A28] text-xs flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-[#008DD2]" />
                    <span>{otpError}</span>
                  </div>
                )}

                {/* OTP Sent Notice Card */}
                {otpSent && (
                  <div className="space-y-3">
                    {otpInfo?.emailSent ? (
                      <div className="p-4 rounded-lg bg-[#E6F4FA] border border-[#59B5E2] text-[#006393] text-xs space-y-2">
                        <div className="flex items-center gap-2 font-bold text-[#006393] text-sm">
                          <CheckCircle2 className="w-4 h-4 text-[#008DD2]" />
                          OTP Dispatched in Real-Time to Email Inbox!
                        </div>
                        <p className="text-[#403F3E]">
                          A 6-digit one-time password was sent to <span className="font-bold text-[#2B2A28] underline">{otpEmail}</span>. Please check your inbox and enter it below.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-[#E6F4FA] border border-[#59B5E2] text-[#006393] text-xs space-y-2">
                        <div className="flex items-center gap-2 font-bold text-[#006393] text-sm">
                          <CheckCircle2 className="w-4 h-4 text-[#008DD2]" />
                          OTP Generated for Direct Access
                        </div>
                        <p className="text-[#403F3E]">
                          Recipient: <span className="font-semibold text-[#2B2A28]">{otpEmail}</span>
                        </p>
                        {generatedOtpCode && (
                          <div className="flex items-center justify-between bg-[#FFFFFF] px-3.5 py-2.5 rounded-lg border border-[#59B5E2] shadow-xs">
                            <span className="text-[#403F3E] font-medium">Your Login OTP:</span>
                            <span className="font-mono font-bold text-lg text-[#008DD2] tracking-[0.25em]">
                              {generatedOtpCode}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 1: Request OTP */}
                {!otpSent ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendOtp();
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-[#403F3E] mb-1.5">
                        Recipient Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#757573] absolute left-3.5 top-3" />
                        <input
                          type="email"
                          required
                          value={otpEmail}
                          onChange={(e) => setOtpEmail(e.target.value)}
                          placeholder="yourname@gmail.com"
                          className="w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#2B2A28] focus:outline-none focus:border-[#008DD2] focus:bg-[#E6F4FA] transition-colors placeholder:text-[#757573] font-medium"
                        />
                      </div>
                      <p className="text-[11px] text-[#757573] mt-1.5">
                        Enter your email address to receive your 6-digit verification code.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={otpLoading}
                      className="w-full py-3 px-4 rounded-lg font-bold text-sm bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-[#FFFFFF] shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-[#FFFFFF]" />
                      {otpLoading ? "Generating & Sending OTP..." : "Send Login OTP"}
                    </button>
                  </form>
                ) : (
                  /* Step 2: Enter OTP & Verify */
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-[#403F3E]">
                          Enter 6-Digit OTP Code
                        </label>
                        <button
                          type="button"
                          onClick={() => handleSendOtp()}
                          disabled={otpLoading}
                          className="text-xs font-semibold text-[#008DD2] hover:text-[#0078B2] flex items-center gap-1 transition-colors cursor-pointer"
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
                        className="w-full bg-[#FFFFFF] border-2 border-[#008DD2] rounded-lg py-3 text-center text-2xl font-mono tracking-[0.4em] text-[#2B2A28] focus:outline-none focus:border-[#0078B2] focus:bg-[#E6F4FA] transition-colors placeholder:text-[#757573] font-bold"
                      />
                    </div>

                    {/* Optional: Set New Password */}
                    <div className="pt-1 border-t border-[#EAEAEA]">
                      <label className="flex items-center gap-2 text-xs font-medium text-[#403F3E] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wantsNewPassword}
                          onChange={(e) => setWantsNewPassword(e.target.checked)}
                          className="w-4 h-4 rounded text-[#008DD2] bg-[#FFFFFF] border-[#D5D4D4] focus:ring-[#008DD2]"
                        />
                        <span>Also update my password now (Optional)</span>
                      </label>

                      {wantsNewPassword && (
                        <div className="mt-3 relative">
                          <Lock className="w-4 h-4 text-[#757573] absolute left-3.5 top-3" />
                          <input
                            type={showOtpNewPassword ? "text" : "password"}
                            value={otpNewPassword}
                            onChange={(e) => setOtpNewPassword(e.target.value)}
                            placeholder="Enter new password (min. 6 chars)"
                            className="w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-lg pl-10 pr-11 py-2 text-sm text-[#2B2A28] focus:outline-none focus:border-[#008DD2] focus:bg-[#E6F4FA] transition-colors placeholder:text-[#757573] font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOtpNewPassword((prev) => !prev)}
                            className="absolute right-2.5 top-1.5 p-1 rounded text-[#757573] hover:text-[#2B2A28] transition-colors cursor-pointer"
                          >
                            {showOtpNewPassword ? (
                              <EyeOff className="w-3.5 h-3.5 text-[#757573]" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-[#757573]" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={otpLoading || otpCode.length !== 6}
                      className="w-full py-3 px-4 rounded-lg font-bold text-sm bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-[#FFFFFF] shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {otpLoading ? "Verifying OTP..." : "Verify OTP & Sign In"}
                      <ArrowRight className="w-4 h-4 text-[#FFFFFF]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode("");
                        setGeneratedOtpCode("");
                        setOtpError("");
                      }}
                      className="w-full py-2 text-xs font-semibold text-[#757573] hover:text-[#2B2A28] transition-colors cursor-pointer"
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

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-[#2B2A28]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#D5D4D4] rounded-xl p-6 shadow-lg relative text-[#403F3E]">
            <h3 className="text-lg font-bold text-[#2B2A28] mb-1">Password Recovery</h3>
            <p className="text-xs text-[#757573] mb-4">
              Choose an authentication method to access or reset your account.
            </p>

            <div className="flex bg-[#EAEAEA] p-1 rounded-lg border border-[#D5D4D4] mb-4">
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  switchToOtpLogin();
                }}
                className="flex-1 py-1.5 text-xs font-semibold rounded-md bg-[#008DD2] text-[#FFFFFF] shadow-xs cursor-pointer"
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
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  resetTab === "oldPassword"
                    ? "bg-[#008DD2] text-[#FFFFFF] shadow-xs"
                    : "text-[#403F3E] hover:text-[#2B2A28]"
                }`}
              >
                Reset with Old Pass
              </button>
            </div>

            {resetError && (
              <div className="mb-4 p-3 rounded-lg bg-[#EAEAEA] border border-[#D5D4D4] text-[#2B2A28] text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-[#008DD2]" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-[#E6F4FA] border border-[#59B5E2] text-[#006393] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#008DD2]" />
                <span>{resetSuccess}</span>
              </div>
            )}

            {resetTab === "oldPassword" ? (
              <form onSubmit={handleForgotPasswordWithOld} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#403F3E] mb-1">
                    Registered Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#757573] absolute left-3.5 top-2.5" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@uttambharat.com"
                      className="w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-lg pl-10 pr-4 py-2 text-sm text-[#2B2A28] focus:outline-none focus:border-[#008DD2] focus:bg-[#E6F4FA] transition-colors placeholder:text-[#757573]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#403F3E] mb-1">
                    Old Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#757573] absolute left-3.5 top-2.5" />
                    <input
                      type={showResetOldPassword ? "text" : "password"}
                      required
                      value={resetOldPassword}
                      onChange={(e) => setResetOldPassword(e.target.value)}
                      placeholder="Enter your current old password"
                      className="w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-lg pl-10 pr-10 py-2 text-sm text-[#2B2A28] focus:outline-none focus:border-[#008DD2] focus:bg-[#E6F4FA] transition-colors placeholder:text-[#757573]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetOldPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1.5 p-1 rounded text-[#757573] hover:text-[#2B2A28] transition-colors cursor-pointer"
                    >
                      {showResetOldPassword ? (
                        <EyeOff className="w-3.5 h-3.5 text-[#757573]" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-[#757573]" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#403F3E] mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#757573] absolute left-3.5 top-2.5" />
                    <input
                      type={showResetNewPassword ? "text" : "password"}
                      required
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 characters)"
                      className="w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-lg pl-10 pr-10 py-2 text-sm text-[#2B2A28] focus:outline-none focus:border-[#008DD2] focus:bg-[#E6F4FA] transition-colors placeholder:text-[#757573]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1.5 p-1 rounded text-[#757573] hover:text-[#2B2A28] transition-colors cursor-pointer"
                    >
                      {showResetNewPassword ? (
                        <EyeOff className="w-3.5 h-3.5 text-[#757573]" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-[#757573]" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#403F3E] mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#757573] absolute left-3.5 top-2.5" />
                    <input
                      type={showResetConfirmPassword ? "text" : "password"}
                      required
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-lg pl-10 pr-10 py-2 text-sm text-[#2B2A28] focus:outline-none focus:border-[#008DD2] focus:bg-[#E6F4FA] transition-colors placeholder:text-[#757573]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1.5 p-1 rounded text-[#757573] hover:text-[#2B2A28] transition-colors cursor-pointer"
                    >
                      {showResetConfirmPassword ? (
                        <EyeOff className="w-3.5 h-3.5 text-[#757573]" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-[#757573]" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#EAEAEA] hover:bg-[#D5D4D4] text-[#403F3E] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2 rounded-lg text-xs font-bold bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-[#FFFFFF] shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {resetLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotPasswordEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#403F3E] mb-1.5">
                    Registered Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#757573] absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@uttambharat.com"
                      className="w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#2B2A28] focus:outline-none focus:border-[#008DD2] focus:bg-[#E6F4FA] transition-colors placeholder:text-[#757573]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#EAEAEA] hover:bg-[#D5D4D4] text-[#403F3E] transition-all cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2 rounded-lg text-xs font-bold bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-[#FFFFFF] shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
