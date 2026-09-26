import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { collection, onSnapshot, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Training, EmployeeRegistration, TrainingFeedback, QuizAttempt } from "../types";
import { buildMultiDepartmentPayload } from "../lib/googleSheetExport";
import { soundEffects } from "../lib/soundEffects";

const AUTO_SYNC_INTERVAL_SECONDS = 10 * 60; // 10 minutes = 600 seconds

interface AutoSyncContextType {
  webhookUrl: string;
  setWebhookUrl: (url: string) => void;
  isAutoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  secondsRemaining: number;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  lastSyncMessage: string | null;
  lastSyncSuccess: boolean | null;
  toggleAutoSync: (targetState?: boolean) => Promise<{ success: boolean; message: string }>;
  triggerSyncNow: () => Promise<{ success: boolean; message: string }>;
  saveWebhookUrl: (url: string) => Promise<{ success: boolean; message: string }>;
}

const GoogleSheetsAutoSyncContext = createContext<AutoSyncContextType | undefined>(undefined);

export const GoogleSheetsAutoSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(AUTO_SYNC_INTERVAL_SECONDS);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);
  const [lastSyncSuccess, setLastSyncSuccess] = useState<boolean | null>(null);

  // Firestore datasets
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [registrations, setRegistrations] = useState<EmployeeRegistration[]>([]);
  const [feedbacks, setFeedbacks] = useState<TrainingFeedback[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  // Refs for interval execution
  const webhookUrlRef = useRef<string>(webhookUrl);
  webhookUrlRef.current = webhookUrl;

  const isAutoSyncRef = useRef<boolean>(isAutoSyncEnabled);
  isAutoSyncRef.current = isAutoSyncEnabled;

  const isSyncingRef = useRef<boolean>(isSyncing);
  isSyncingRef.current = isSyncing;

  const datasetsRef = useRef({ trainings, registrations, feedbacks, attempts });
  datasetsRef.current = { trainings, registrations, feedbacks, attempts };

  // 1. Subscribe to Firestore data
  useEffect(() => {
    const unsubT = onSnapshot(collection(db, "trainings"), (snap) => {
      setTrainings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Training)));
    });
    const unsubR = onSnapshot(collection(db, "registrations"), (snap) => {
      setRegistrations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EmployeeRegistration)));
    });
    const unsubF = onSnapshot(collection(db, "feedbacks"), (snap) => {
      setFeedbacks(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrainingFeedback)));
    });
    const unsubA = onSnapshot(collection(db, "quiz_attempts"), (snap) => {
      setAttempts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizAttempt)));
    });

    return () => {
      unsubT();
      unsubR();
      unsubF();
      unsubA();
    };
  }, []);

  // 2. Load Google Sheets settings from server and Firestore
  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/google-sheets-config");
        if (res.ok) {
          const data = await res.json();
          if (data.config && isMounted) {
            if (data.config.webhookUrl) setWebhookUrl(data.config.webhookUrl);
            if (typeof data.config.autoSync === "boolean") {
              setIsAutoSyncEnabled(data.config.autoSync);
            }
            if (data.config.lastSyncedAt) setLastSyncedAt(data.config.lastSyncedAt);
          }
        }
      } catch (e) {
        console.warn("Could not load /api/google-sheets-config:", e);
      }

      try {
        const docRef = doc(db, "system_settings", "google_sheets");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && isMounted) {
          const d = docSnap.data();
          if (d.webhookUrl) setWebhookUrl(d.webhookUrl);
          if (typeof d.autoSync === "boolean") {
            setIsAutoSyncEnabled(d.autoSync);
          }
          if (d.lastSyncedAt) setLastSyncedAt(d.lastSyncedAt);
        }
      } catch (err) {
        console.warn("Could not load Firestore google_sheets settings:", err);
      }
    };

    loadConfig();

    // Listen in real-time to changes in Firestore config
    const unsubConfig = onSnapshot(doc(db, "system_settings", "google_sheets"), (docSnap) => {
      if (docSnap.exists() && isMounted) {
        const d = docSnap.data();
        if (d.webhookUrl !== undefined) setWebhookUrl(d.webhookUrl || "");
        if (typeof d.autoSync === "boolean") {
          setIsAutoSyncEnabled(d.autoSync);
        }
        if (d.lastSyncedAt) setLastSyncedAt(d.lastSyncedAt);
      }
    });

    return () => {
      isMounted = false;
      unsubConfig();
    };
  }, []);

  // Core execution function
  const executeSync = useCallback(
    async (triggerType: "manual" | "auto" = "manual"): Promise<{ success: boolean; message: string }> => {
      const url = webhookUrlRef.current.trim();
      if (!url) {
        return { success: false, message: "Google Apps Script Web App URL is not configured." };
      }

      if (isSyncingRef.current) {
        return { success: false, message: "A synchronization is already in progress." };
      }

      setIsSyncing(true);

      try {
        const { trainings: tList, registrations: rList, feedbacks: fList, attempts: aList } = datasetsRef.current;
        const payload = buildMultiDepartmentPayload(rList, fList, aList, tList);

        const res = await fetch("/api/sync-google-sheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            webhookUrl: url,
            payload,
            triggerType
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to synchronize to Google Sheets.");
        }

        const now = new Date().toISOString();
        setLastSyncedAt(now);
        setLastSyncSuccess(true);
        const deptCount = payload.summary?.length || Object.keys(payload.departments || {}).length || 0;
        const msg =
          data.message ||
          `Data successfully updated in Google Sheets (${payload.totalCandidates} records, ${deptCount} departments).`;
        setLastSyncMessage(msg);

        // Update lastSyncedAt in Firestore
        try {
          await setDoc(
            doc(db, "system_settings", "google_sheets"),
            { lastSyncedAt: now },
            { merge: true }
          );
        } catch (_) {}

        if (triggerType === "manual") {
          soundEffects.playSuccessJingle();
        }

        return { success: true, message: msg };
      } catch (err: any) {
        console.error("Sync error:", err);
        const errMsg = err?.message || "Failed to synchronize with Google Sheets.";
        setLastSyncSuccess(false);
        setLastSyncMessage(errMsg);

        if (triggerType === "manual") {
          soundEffects.playWarningAlert();
        }

        return { success: false, message: errMsg };
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  // 3. Auto-sync 1-second countdown and 10-minute interval trigger
  useEffect(() => {
    if (!isAutoSyncEnabled || !webhookUrl.trim()) {
      setSecondsRemaining(AUTO_SYNC_INTERVAL_SECONDS);
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Trigger the 10-minute recurring sync
          executeSync("auto");
          return AUTO_SYNC_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoSyncEnabled, webhookUrl, executeSync]);

  // Toggle Auto Sync ON/OFF
  const toggleAutoSync = async (targetState?: boolean): Promise<{ success: boolean; message: string }> => {
    soundEffects.playTouchTap();
    const cleanUrl = webhookUrl.trim();
    const newState = targetState !== undefined ? targetState : !isAutoSyncEnabled;

    if (newState && !cleanUrl) {
      soundEffects.playWarningAlert();
      return {
        success: false,
        message: "Please enter and save a valid Google Apps Script Web App URL first before enabling auto synchronization."
      };
    }

    setIsAutoSyncEnabled(newState);
    setSecondsRemaining(AUTO_SYNC_INTERVAL_SECONDS);

    // Save state to server
    try {
      await fetch("/api/save-google-sheets-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: cleanUrl,
          autoSync: newState,
          autoSyncIntervalMinutes: 10
        })
      });
    } catch (e) {
      console.warn("Could not save autoSync to server:", e);
    }

    // Save state to Firestore
    try {
      await setDoc(
        doc(db, "system_settings", "google_sheets"),
        {
          autoSync: newState,
          autoSyncIntervalMinutes: 10,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("Could not save autoSync to Firestore:", e);
    }

    if (newState) {
      soundEffects.playSuccessJingle();
      // Immediately run an initial sync so user gets fresh data right away
      executeSync("auto");
      return {
        success: true,
        message: "Auto synchronization activated! Data will automatically update every 10 minutes."
      };
    } else {
      return {
        success: true,
        message: "Auto synchronization turned off. You can still synchronize manually."
      };
    }
  };

  // Trigger manual sync
  const triggerSyncNow = async (): Promise<{ success: boolean; message: string }> => {
    soundEffects.playTouchTap();
    const res = await executeSync("manual");
    // Reset the 10-minute timer after manual sync if auto sync is enabled
    if (isAutoSyncEnabled) {
      setSecondsRemaining(AUTO_SYNC_INTERVAL_SECONDS);
    }
    return res;
  };

  // Save Webhook URL
  const saveWebhookUrl = async (url: string): Promise<{ success: boolean; message: string }> => {
    soundEffects.playTouchTap();
    const clean = url.trim();
    setWebhookUrl(clean);

    try {
      await fetch("/api/save-google-sheets-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: clean,
          autoSync: isAutoSyncEnabled,
          autoSyncIntervalMinutes: 10
        })
      });

      await setDoc(
        doc(db, "system_settings", "google_sheets"),
        {
          webhookUrl: clean,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

      soundEffects.playSuccessJingle();
      return {
        success: true,
        message: clean ? "Web App URL saved successfully!" : "Web App URL cleared."
      };
    } catch (err: any) {
      soundEffects.playWarningAlert();
      return {
        success: false,
        message: err?.message || "Failed to save Web App URL."
      };
    }
  };

  return (
    <GoogleSheetsAutoSyncContext.Provider
      value={{
        webhookUrl,
        setWebhookUrl,
        isAutoSyncEnabled,
        autoSyncIntervalMinutes: 10,
        secondsRemaining,
        lastSyncedAt,
        isSyncing,
        lastSyncMessage,
        lastSyncSuccess,
        toggleAutoSync,
        triggerSyncNow,
        saveWebhookUrl
      }}
    >
      {children}
    </GoogleSheetsAutoSyncContext.Provider>
  );
};

export const useGoogleSheetsAutoSync = (): AutoSyncContextType => {
  const context = useContext(GoogleSheetsAutoSyncContext);
  if (!context) {
    throw new Error("useGoogleSheetsAutoSync must be used within a GoogleSheetsAutoSyncProvider");
  }
  return context;
};
