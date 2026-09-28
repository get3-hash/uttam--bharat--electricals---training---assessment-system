import React, { useState } from "react";
import { GlassCard } from "./GlassCard";
import {
  FileSpreadsheet,
  Copy,
  Check,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Code2,
  ShieldCheck,
  Activity,
  Clock,
  Radio,
  Timer
} from "lucide-react";
import { soundEffects } from "../lib/soundEffects";
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from "../lib/googleSheetExport";
import { useGoogleSheetsAutoSync } from "../context/GoogleSheetsAutoSyncContext";

export const GoogleSheetsSyncSettings: React.FC = () => {
  const {
    webhookUrl,
    setWebhookUrl,
    isAutoSyncEnabled,
    autoSyncIntervalMinutes,
    secondsRemaining,
    lastSyncedAt,
    isSyncing,
    lastSyncMessage,
    lastSyncSuccess,
    toggleAutoSync,
    triggerSyncNow,
    saveWebhookUrl
  } = useGoogleSheetsAutoSync();

  const [savingUrl, setSavingUrl] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [togglingAutoSync, setTogglingAutoSync] = useState(false);

  const [localMessage, setLocalMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Active notification message prioritizes local operations then context
  const activeMessage = localMessage || (lastSyncMessage ? { success: Boolean(lastSyncSuccess), text: lastSyncMessage } : null);

  // Format countdown mm:ss
  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60);
    const secs = Math.max(0, totalSeconds) % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress % for 10-minute cycle (600 seconds)
  const totalCycleSeconds = autoSyncIntervalMinutes * 60;
  const cycleProgressPercent = Math.min(
    100,
    Math.max(0, ((totalCycleSeconds - secondsRemaining) / totalCycleSeconds) * 100)
  );

  // Calculate projected next sync time
  const getNextSyncEstimatedTime = () => {
    const nextDate = new Date(Date.now() + secondsRemaining * 1000);
    return nextDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  // Toggle Auto-Sync
  const handleToggleAutoSync = async () => {
    setTogglingAutoSync(true);
    setLocalMessage(null);

    const res = await toggleAutoSync();
    setLocalMessage({
      success: res.success,
      text: res.message
    });

    setTogglingAutoSync(false);
  };

  // Save the Webhook / Web App URL
  const handleSaveUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingUrl(true);
    setLocalMessage(null);

    const res = await saveWebhookUrl(webhookUrl);
    setLocalMessage({
      success: res.success,
      text: res.message
    });

    setSavingUrl(false);
  };

  // Test connection to Google Apps Script Web App
  const handleTestConnection = async () => {
    soundEffects.playTouchTap();
    const cleanUrl = webhookUrl.trim();

    if (!cleanUrl) {
      soundEffects.playWarningAlert();
      setLocalMessage({
        success: false,
        text: "Please enter your Google Apps Script Web App URL first to test the connection."
      });
      return;
    }

    setTesting(true);
    setLocalMessage(null);

    try {
      const res = await fetch("/api/test-google-sheets-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: cleanUrl })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to establish connection with Google Sheets Web App.");
      }

      soundEffects.playSuccessJingle();
      setLocalMessage({
        success: true,
        text: data.message || "Connection test successful! Webhook is responsive and reachable."
      });
    } catch (err: any) {
      soundEffects.playWarningAlert();
      setLocalMessage({
        success: false,
        text: err.message || "Connection test failed. Please verify your Web App URL and deployment access."
      });
    } finally {
      setTesting(false);
    }
  };

  // Trigger manual synchronization
  const handleManualSync = async () => {
    setLocalMessage(null);
    const res = await triggerSyncNow();
    setLocalMessage({
      success: res.success,
      text: res.message
    });
  };

  // Copy Code.gs template to clipboard
  const handleCopyCode = async () => {
    soundEffects.playTouchTap();
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
      setCopiedCode(true);
      soundEffects.playSuccessJingle();
      setTimeout(() => setCopiedCode(false), 3000);
    } catch (err) {
      console.error("Failed to copy Code.gs:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Card */}
      <GlassCard className="p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Google Sheets Synchronization
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Synchronize training attendance, 5-criteria feedbacks, and quiz scores directly into Google Sheets.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Auto-Sync Badge */}
            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border ${
                isAutoSyncEnabled
                  ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400/60 text-emerald-700 dark:text-emerald-300"
                  : "bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isAutoSyncEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              <span>
                {isAutoSyncEnabled
                  ? `Auto-Sync Active (Every ${autoSyncIntervalMinutes}m)`
                  : "Auto-Sync: OFF"}
              </span>
            </div>

            {lastSyncedAt && (
              <div className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Last Synced:{" "}
                  {new Date(lastSyncedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* SECTION 1: AUTO SYNCHRONIZATION FEATURE CARD (10 MINUTE RECURRING) */}
      <GlassCard
        className={`p-6 sm:p-7 border-2 transition-all shadow-xl relative overflow-hidden ${
          isAutoSyncEnabled
            ? "border-emerald-500/70 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 dark:from-emerald-950/20 dark:via-slate-900 dark:to-teal-950/20"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        }`}
      >
        {/* Accent Glow Top Stripe */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 transition-colors ${
            isAutoSyncEnabled
              ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500"
              : "bg-slate-200 dark:bg-slate-700"
          }`}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Column: Title & Description */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2.5">
              <span
                className={`p-2 rounded-xl transition-colors ${
                  isAutoSyncEnabled
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}
              >
                <Radio className={`w-5 h-5 ${isAutoSyncEnabled ? "animate-pulse" : ""}`} />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Auto Synchronization (Every 10 Minutes)
                  {isAutoSyncEnabled && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                      ON
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Automatically updates Google Sheets records every 10 minutes
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
              When turned <strong className="text-emerald-600 dark:text-emerald-400">ON</strong>, all candidate registrations, department-wise records, 5-criteria employee feedbacks, and quiz test attempts will automatically push to your connected Google Sheet in the background every <strong>10 minutes</strong>.
            </p>
          </div>

          {/* Right Column: Toggle Switch Button & Action */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-3 shrink-0">
            {/* Toggle Switch */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {isAutoSyncEnabled ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">AUTO SYNC: ON</span>
                ) : (
                  <span className="text-slate-500">AUTO SYNC: OFF</span>
                )}
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={isAutoSyncEnabled}
                onClick={handleToggleAutoSync}
                disabled={togglingAutoSync}
                className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  isAutoSyncEnabled
                    ? "bg-emerald-600 shadow-md shadow-emerald-500/30"
                    : "bg-slate-300 dark:bg-slate-700"
                } disabled:opacity-50`}
                title={isAutoSyncEnabled ? "Click to turn OFF auto-sync" : "Click to turn ON auto-sync (10 min)"}
              >
                <span className="sr-only">Toggle Auto Synchronization</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isAutoSyncEnabled ? "translate-x-8" : "translate-x-0"
                  } flex items-center justify-center`}
                >
                  {isAutoSyncEnabled ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                  )}
                </span>
              </button>
            </div>

            {/* Quick Trigger Button */}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing || !webhookUrl.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Force an immediate sync to Google Sheets right now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Sync Now (Force Instant)"}</span>
            </button>
          </div>
        </div>

        {/* Live Timer & Countdown Status Bar */}
        {isAutoSyncEnabled ? (
          <div className="mt-5 pt-4 border-t border-emerald-200/80 dark:border-emerald-800/40">
            <div className="bg-white/80 dark:bg-slate-900/90 rounded-xl p-4 border border-emerald-300/80 dark:border-emerald-700/60 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <Timer className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                  <span>Next Automatic Sync In:</span>
                  <span className="font-mono text-base font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
                    {formatCountdown(secondsRemaining)}
                  </span>
                  <span className="text-slate-500 font-normal hidden sm:inline">
                    (Interval: Every 10 min)
                  </span>
                </div>

                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Estimated next run at: <strong className="text-slate-700 dark:text-slate-300">{getNextSyncEstimatedTime()}</strong>
                </div>
              </div>

              {/* Progress Bar of Current 10-Minute Window */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700/60">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${cycleProgressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>00:00 (Start)</span>
                  <span>{Math.round(cycleProgressPercent)}% window elapsed</span>
                  <span>10:00 (Auto Sync)</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Auto-sync is currently paused. Toggle the switch to <strong>ON</strong> to enable 10-minute automated synchronization.</span>
              </span>
              <button
                type="button"
                onClick={handleToggleAutoSync}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline shrink-0 ml-2"
              >
                Turn ON Now →
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Notification Message */}
      {activeMessage && (
        <div className="space-y-3">
          <div
            className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 border shadow-sm ${
              activeMessage.success
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300"
            }`}
          >
            {activeMessage.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span className="flex-1 leading-relaxed">{activeMessage.text}</span>
          </div>

          {/* Quick Resolution Help Card if Google Apps Script is running an outdated deployment or cell data validation error */}
          {!activeMessage.success &&
            (activeMessage.text.includes("number of columns") ||
              activeMessage.text.includes("Exception") ||
              activeMessage.text.includes("violates the data validation rules") ||
              activeMessage.text.includes("data validation") ||
              activeMessage.text.includes("Script Execution Error")) && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2.5">
                <div className="font-bold flex items-center gap-2 text-sm">
                  <span>⚠️ Resolution: {activeMessage.text.includes("violates the data validation rules") ? "Cell Data Validation Conflict in Google Sheet" : "Google Apps Script Update Needed"}</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-95">
                  {activeMessage.text.includes("violates the data validation rules")
                    ? "Your Google Sheet has existing cell validation constraints (such as a dropdown list on Column E / cell E7) that reject incoming training records. The latest Code.gs script automatically clears cell validation rules before writing to guarantee seamless synchronization."
                    : "Your Google Spreadsheet Web App URL is running an older script deployment that encountered a write error. Apps Script requires saving and deploying a New Version:"}
                </p>
                <ol className="list-decimal list-inside text-[11px] space-y-1.5 pl-1">
                  <li>Click <strong>Copy Updated Code.gs (Validation-Safe)</strong> below and paste it into your sheet under <em>Extensions → Apps Script</em>. Click <strong>Save (💾)</strong>.</li>
                  <li>At the top right of Apps Script, click <strong>Deploy → Manage deployments</strong>.</li>
                  <li>Click the pencil icon <strong>(✏️ Edit)</strong>, select <strong>Version: "New version"</strong>, and click <strong>Deploy</strong>.</li>
                  {activeMessage.text.includes("violates the data validation rules") && (
                    <li><em>Instant alternative:</em> In your Google Sheet, select the entire sheet (Ctrl+A / Cmd+A), then click <strong>Data → Data validation → Remove validation</strong>, and then click Retry Sync below.</li>
                  )}
                </ol>
                <div className="pt-1.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3.5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedCode ? "Copied Updated Code.gs!" : "Copy Updated Code.gs (Validation-Safe)"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>Retry Sync Now</span>
                  </button>
                </div>
              </div>
            )}
        </div>
      )}

      {/* SECTION 2: Web App URL Configuration */}
      <GlassCard className="p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
        <div>
          <label
            htmlFor="webhook-url-input"
            className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            Google Apps Script Web App URL
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Paste your deployed Google Apps Script Web App URL below to enable manual and auto synchronization.
          </p>
        </div>

        <form onSubmit={handleSaveUrl} className="space-y-4">
          <div className="relative">
            <input
              id="webhook-url-input"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycbz.../exec"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !webhookUrl.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              title="Send a quick ping to test if your Web App URL connects properly"
            >
              <Activity className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
              <span>{testing ? "Testing Connection..." : "Test Connection"}</span>
            </button>

            <button
              type="submit"
              disabled={savingUrl}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {savingUrl ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span className="text-white">Saving URL...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span className="text-white">Save URL</span>
                </>
              )}
            </button>
          </div>
        </form>
      </GlassCard>

      {/* SECTION 3: Code.gs Setup & Reference Area */}
      <GlassCard className="p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Google Apps Script (Code.gs)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Copy and paste this script into your Google Spreadsheet's Apps Script editor.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            {copiedCode ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied Code.gs!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Code.gs</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Instructions */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
          <span className="font-bold text-slate-900 dark:text-white block">
            How to setup in 3 easy steps:
          </span>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
            <li>
              In your Google Sheet, click top menu: <strong>Extensions → Apps Script</strong>.
            </li>
            <li>
              Delete all code in <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-emerald-700 dark:text-emerald-400">Code.gs</code>, paste the copied code below, and click <strong>Save (💾)</strong>.
            </li>
            <li>
              Click <strong>Deploy → New deployment → Web app</strong> (or <em>Manage deployments → Edit (✏️) → New version</em> if updating). Set <em>Who has access</em> to <strong>"Anyone"</strong>, click Deploy, and copy the <strong>Web app URL</strong> into the box above.
            </li>
          </ol>
        </div>

        {/* Code Box */}
        <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
          <div className="bg-slate-900 text-slate-300 px-4 py-2 text-xs font-mono font-semibold flex items-center justify-between border-b border-slate-800">
            <span>Code.gs</span>
            <span className="text-[11px] text-slate-400">Google Apps Script</span>
          </div>
          <pre className="p-4 bg-slate-950 text-slate-200 text-xs font-mono leading-relaxed overflow-x-auto max-h-96 selection:bg-emerald-700 selection:text-white">
            {GOOGLE_APPS_SCRIPT_TEMPLATE}
          </pre>
        </div>
      </GlassCard>
    </div>
  );
};
