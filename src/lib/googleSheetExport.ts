import { Training, EmployeeRegistration, TrainingFeedback, QuizAttempt } from "../types";

export interface GoogleSheetsExportOptions {
  includeFeedback?: boolean;
  includeQuizAttempts?: boolean;
}

/**
 * Formats training records into Google Sheets CSV with UTF-8 BOM.
 * Opens seamlessly in Google Sheets, Google Drive, and mobile spreadsheets without character encoding issues.
 */
export function generateGoogleSheetsCsv(
  training: Training,
  registrations: EmployeeRegistration[],
  feedbacks: TrainingFeedback[],
  attempts: QuizAttempt[]
): string {
  const rows: string[][] = [];

  // Metadata Header Block
  rows.push(["UTTAM (BHARAT) ELECTRICALS PVT. LTD. - TRAINING & ASSESSMENT REPORT"]);
  rows.push(["Training Topic:", training.title]);
  rows.push(["Department:", training.department || "General"]);
  rows.push(["Trainer Name:", training.trainerName || "N/A"]);
  rows.push(["Training Date:", training.trainingDate || new Date().toISOString().split("T")[0]]);
  rows.push(["Session Category / Folder:", training.folderName || "General Batch"]);
  rows.push(["Passing Benchmark:", `${training.passingPercentage || 70}%`]);
  rows.push(["Generated On:", new Date().toLocaleString()]);
  rows.push([]);

  // Section 1: Candidate Attendance & Examination Overview
  rows.push(["--- SECTION 1: CANDIDATE REGISTRATION & QUIZ PERFORMANCE ---"]);
  rows.push([
    "Emp Code",
    "Employee Name",
    "Department",
    "Designation",
    "Email",
    "Phone",
    "Registration Date",
    "Feedback Submitted",
    "Quiz Status",
    "Quiz Score",
    "Percentage (%)",
    "Result (PASS/FAIL)"
  ]);

  registrations.forEach((reg) => {
    const fb = feedbacks.find((f) => f.registrationId === reg.id || f.employeeCode === reg.employeeCode);
    const att = attempts.find((a) => a.registrationId === reg.id || a.employeeCode === reg.employeeCode);

    rows.push([
      reg.employeeCode || "-",
      reg.employeeName || "-",
      reg.department || "-",
      reg.designation || "-",
      reg.email || "-",
      reg.phone || "-",
      reg.registeredAt ? new Date(reg.registeredAt).toLocaleString() : "-",
      fb ? "YES" : "NO",
      att ? "Completed" : "Pending",
      att ? `${att.score} / ${att.totalQuestions}` : "-",
      att ? `${att.percentage}%` : "-",
      att ? (att.passed ? "PASS" : "FAIL") : "-"
    ]);
  });

  rows.push([]);
  rows.push([]);

  // Section 2: Exact 5-Criteria Feedback Details
  rows.push(["--- SECTION 2: 5-CRITERIA TRAINING FEEDBACK EVALUATION ---"]);
  rows.push([
    "Emp Code",
    "Employee Name",
    "Department",
    "1. Topic Covered as per Expectation (1-5)",
    "2. Quality of Slides / Audio / Visual Aids (1-5)",
    "3. Trainer Efforts & Effectiveness (1-5)",
    "4. Trainer Efforts in Involving Everyone (1-5)",
    "5. Trainer Inviting & Answering Questions (1-5)",
    "Average Rating (1-5)",
    "Submitted At"
  ]);

  feedbacks.forEach((fb) => {
    const q1 = fb.ratings?.expectationCovered ?? fb.ratings?.objectivesCovered ?? 5;
    const q2 = fb.ratings?.trainingAidsQuality ?? fb.ratings?.trainingMaterial ?? 5;
    const q3 = fb.ratings?.trainerEffectiveness ?? fb.ratings?.presentationDelivery ?? 5;
    const q4 = fb.ratings?.trainerInvolvement ?? fb.ratings?.communicationClarity ?? 5;
    const q5 = fb.ratings?.trainerAnsweringQuestions ?? fb.ratings?.interactionQa ?? 5;
    const avg = ((q1 + q2 + q3 + q4 + q5) / 5).toFixed(1);

    rows.push([
      fb.employeeCode || "-",
      fb.employeeName || "-",
      fb.department || "-",
      String(q1),
      String(q2),
      String(q3),
      String(q4),
      String(q5),
      avg,
      fb.submittedAt ? new Date(fb.submittedAt).toLocaleString() : "-"
    ]);
  });

  // Convert array to CSV string with proper escaping and quotes
  return rows
    .map((row) =>
      row
        .map((field) => {
          const str = String(field ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    )
    .join("\r\n");
}

/**
 * Downloads the training dataset formatted for direct import into Google Sheets.
 */
export function exportTrainingReportToGoogleSheets(
  training: Training,
  registrations: EmployeeRegistration[],
  feedbacks: TrainingFeedback[],
  attempts: QuizAttempt[]
) {
  const csvContent = generateGoogleSheetsCsv(training, registrations, feedbacks, attempts);

  // Use UTF-8 Byte Order Mark (\uFEFF) so Google Sheets, Excel & browsers interpret UTF-8 text properly
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const safeTitle = (training.title || "Uttam_Training_Report").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${safeTitle}_Google_Sheets.csv`;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Copies Google Sheets formatted TSV data to clipboard for 1-click paste into https://sheets.new
 */
export async function copyDataForGoogleSheets(
  training: Training,
  registrations: EmployeeRegistration[],
  feedbacks: TrainingFeedback[],
  attempts: QuizAttempt[]
): Promise<boolean> {
  const lines: string[] = [];

  // Headers
  lines.push([
    "Emp Code",
    "Employee Name",
    "Department",
    "Designation",
    "Registration Date",
    "Quiz Status",
    "Quiz Score",
    "Percentage",
    "Result",
    "1. Topic Expectation (1-5)",
    "2. Training Aids Quality (1-5)",
    "3. Trainer Effectiveness (1-5)",
    "4. Trainee Involvement (1-5)",
    "5. Q&A and Questions (1-5)",
    "Average Rating"
  ].join("\t"));

  registrations.forEach((reg) => {
    const fb = feedbacks.find((f) => f.registrationId === reg.id || f.employeeCode === reg.employeeCode);
    const att = attempts.find((a) => a.registrationId === reg.id || a.employeeCode === reg.employeeCode);

    const q1 = fb ? (fb.ratings?.expectationCovered ?? fb.ratings?.objectivesCovered ?? 5) : "";
    const q2 = fb ? (fb.ratings?.trainingAidsQuality ?? fb.ratings?.trainingMaterial ?? 5) : "";
    const q3 = fb ? (fb.ratings?.trainerEffectiveness ?? fb.ratings?.presentationDelivery ?? 5) : "";
    const q4 = fb ? (fb.ratings?.trainerInvolvement ?? fb.ratings?.communicationClarity ?? 5) : "";
    const q5 = fb ? (fb.ratings?.trainerAnsweringQuestions ?? fb.ratings?.interactionQa ?? 5) : "";
    const avg = fb ? ((Number(q1) + Number(q2) + Number(q3) + Number(q4) + Number(q5)) / 5).toFixed(1) : "-";

    lines.push([
      reg.employeeCode || "",
      reg.employeeName || "",
      reg.department || "",
      reg.designation || "",
      reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString() : "",
      att ? "Completed" : "Pending",
      att ? `${att.score}/${att.totalQuestions}` : "",
      att ? `${att.percentage}%` : "",
      att ? (att.passed ? "PASS" : "FAIL") : "",
      q1 ? `${q1} / 5` : "-",
      q2 ? `${q2} / 5` : "-",
      q3 ? `${q3} / 5` : "-",
      q4 ? `${q4} / 5` : "-",
      q5 ? `${q5} / 5` : "-",
      avg
    ].join("\t"));
  });

  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    return true;
  } catch (err) {
    console.error("Failed to copy data to clipboard:", err);
    return false;
  }
}

/**
 * Synchronizes records to a configured Google Apps Script Webhook / Web App endpoint.
 */
export async function syncToGoogleSheetsWebhook(
  webhookUrl: string,
  training: Training,
  registrations: EmployeeRegistration[],
  feedbacks: TrainingFeedback[],
  attempts: QuizAttempt[]
): Promise<{ success: boolean; message: string }> {
  try {
    if (!webhookUrl || !webhookUrl.startsWith("http")) {
      throw new Error("Invalid Google Sheets Webhook URL provided.");
    }

    const payload = {
      action: "append_training_records",
      trainingId: training.id,
      title: training.title,
      department: training.department,
      trainerName: training.trainerName,
      trainingDate: training.trainingDate,
      totalAttendees: registrations.length,
      registrations: registrations.map((r) => ({
        employeeCode: r.employeeCode,
        employeeName: r.employeeName,
        department: r.department,
        designation: r.designation
      })),
      feedbacks: feedbacks.map((f) => ({
        employeeCode: f.employeeCode,
        employeeName: f.employeeName,
        ratings: f.ratings
      })),
      quizAttempts: attempts.map((a) => ({
        employeeCode: a.employeeCode,
        employeeName: a.employeeName,
        score: a.score,
        totalQuestions: a.totalQuestions,
        percentage: a.percentage,
        passed: a.passed
      })),
      syncedAt: new Date().toISOString()
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return {
      success: true,
      message: "Data successfully transmitted to Google Sheets Webhook."
    };
  } catch (err: any) {
    console.error("Google Sheets Webhook synchronization error:", err);
    return {
      success: false,
      message: err.message || "Failed to reach Google Sheets endpoint."
    };
  }
}

export const DEFAULT_DEPARTMENTS = [
  "Quality & Testing",
  "Core & Coil Assembly",
  "Tanking & Final Assembly",
  "Design & Engineering",
  "HR & Admin",
  "Maintenance & Utility"
];

export function getUniqueDepartments(
  trainings: Training[] = [],
  registrations: EmployeeRegistration[] = [],
  attempts: QuizAttempt[] = [],
  feedbacks: TrainingFeedback[] = []
): string[] {
  const set = new Set<string>(DEFAULT_DEPARTMENTS);
  trainings.forEach((t) => t.department && set.add(t.department.trim()));
  registrations.forEach((r) => r.department && set.add(r.department.trim()));
  attempts.forEach((a) => a.department && set.add(a.department.trim()));
  feedbacks.forEach((f) => f.department && set.add(f.department.trim()));
  return Array.from(set).filter(Boolean).sort();
}

export interface DepartmentParticipantRecord {
  id: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  trainingTitle: string;
  trainerName: string;
  trainingDate: string;
  quizStatus: "Completed" | "Pending";
  score: number | null;
  totalQuestions: number | null;
  percentage: number | null;
  passed: boolean | null;
  feedbackSubmitted: boolean;
  feedbackRating: number | null;
  registeredAt: string;
  submittedAt?: string;
}

/**
 * Builds consolidated records for a given department or ALL departments.
 */
export function getDepartmentParticipantRecords(
  departmentFilter: string,
  registrations: EmployeeRegistration[],
  feedbacks: TrainingFeedback[],
  attempts: QuizAttempt[],
  trainings: Training[] = []
): DepartmentParticipantRecord[] {
  const isAll = !departmentFilter || departmentFilter === "ALL" || departmentFilter === "All Departments";

  // Create training lookup map
  const trainingMap = new Map<string, Training>();
  trainings.forEach((t) => trainingMap.set(t.id, t));

  return registrations
    .filter((reg) => {
      if (isAll) return true;
      const dept = (reg.department || "").trim().toLowerCase();
      const target = departmentFilter.trim().toLowerCase();
      return dept === target;
    })
    .map((reg) => {
      const fb = feedbacks.find(
        (f) => f.registrationId === reg.id || (reg.employeeCode && f.employeeCode === reg.employeeCode)
      );
      const att = attempts.find(
        (a) => a.registrationId === reg.id || (reg.employeeCode && a.employeeCode === reg.employeeCode)
      );
      const tr = trainingMap.get(reg.trainingId);

      let avgRating: number | null = null;
      if (fb?.ratings) {
        const q1 = fb.ratings.expectationCovered ?? fb.ratings.objectivesCovered ?? 5;
        const q2 = fb.ratings.trainingAidsQuality ?? fb.ratings.trainingMaterial ?? 5;
        const q3 = fb.ratings.trainerEffectiveness ?? fb.ratings.presentationDelivery ?? 5;
        const q4 = fb.ratings.trainerInvolvement ?? fb.ratings.communicationClarity ?? 5;
        const q5 = fb.ratings.trainerAnsweringQuestions ?? fb.ratings.interactionQa ?? 5;
        avgRating = Number(((q1 + q2 + q3 + q4 + q5) / 5).toFixed(1));
      }

      return {
        id: reg.id,
        employeeCode: reg.employeeCode || "N/A",
        employeeName: reg.employeeName || "Unknown",
        department: reg.department || tr?.department || "General",
        designation: reg.designation || "-",
        trainingTitle: reg.trainingTitle || tr?.title || "Transformer Training",
        trainerName: reg.trainerName || tr?.trainerName || "-",
        trainingDate: reg.trainingDate || tr?.trainingDate || "-",
        quizStatus: att ? "Completed" : "Pending",
        score: att ? att.score : null,
        totalQuestions: att ? att.totalQuestions : null,
        percentage: att ? att.percentage : null,
        passed: att ? att.passed : null,
        feedbackSubmitted: !!fb,
        feedbackRating: avgRating,
        registeredAt: reg.registeredAt || "",
        submittedAt: att?.submittedAt || fb?.submittedAt || reg.registeredAt
      };
    });
}

/**
 * Generates department-specific CSV string with UTF-8 BOM
 */
export function generateDepartmentCsv(
  departmentName: string,
  records: DepartmentParticipantRecord[]
): string {
  const rows: string[][] = [];

  rows.push(["UTTAM (BHARAT) ELECTRICALS PVT. LTD. - DEPARTMENT TRAINING RECORD"]);
  rows.push(["Department:", departmentName]);
  rows.push(["Total Candidates:", String(records.length)]);
  rows.push(["Export Timestamp:", new Date().toLocaleString()]);
  rows.push([]);
  rows.push([
    "Employee Code",
    "Employee Name",
    "Department",
    "Designation",
    "Training Title",
    "Trainer Name",
    "Training Date",
    "Quiz Status",
    "Score",
    "Total Questions",
    "Percentage (%)",
    "Result (PASS/FAIL)",
    "Feedback Submitted",
    "Feedback Rating (1-5★)",
    "Registered At",
    "Last Active / Submitted At"
  ]);

  records.forEach((r) => {
    rows.push([
      r.employeeCode,
      r.employeeName,
      r.department,
      r.designation,
      r.trainingTitle,
      r.trainerName,
      r.trainingDate,
      r.quizStatus,
      r.score !== null ? String(r.score) : "-",
      r.totalQuestions !== null ? String(r.totalQuestions) : "-",
      r.percentage !== null ? `${r.percentage}%` : "-",
      r.passed !== null ? (r.passed ? "PASSED" : "FAILED") : "Pending",
      r.feedbackSubmitted ? "YES" : "NO",
      r.feedbackRating !== null ? `${r.feedbackRating}★` : "-",
      r.registeredAt ? new Date(r.registeredAt).toLocaleString() : "-",
      r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "-"
    ]);
  });

  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((field) => {
            const str = String(field ?? "");
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      )
      .join("\r\n")
  );
}

/**
 * Downloads a department-specific CSV file.
 */
export function downloadDepartmentCsv(
  departmentName: string,
  records: DepartmentParticipantRecord[]
) {
  const csvData = generateDepartmentCsv(departmentName, records);
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
  const safeDept = departmentName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Uttam_${safeDept}_Records.csv`;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Copies department formatted TSV for 1-click paste into Google Sheets tab.
 */
export async function copyDepartmentTsvForGoogleSheets(
  records: DepartmentParticipantRecord[]
): Promise<boolean> {
  const lines: string[] = [];

  // Headers
  lines.push([
    "Employee Code",
    "Employee Name",
    "Department",
    "Designation",
    "Training Topic",
    "Trainer",
    "Date",
    "Quiz Status",
    "Score",
    "Total Questions",
    "Percentage",
    "Result",
    "Feedback Rating",
    "Registration Date"
  ].join("\t"));

  records.forEach((r) => {
    lines.push([
      r.employeeCode,
      r.employeeName,
      r.department,
      r.designation,
      r.trainingTitle,
      r.trainerName,
      r.trainingDate,
      r.quizStatus,
      r.score !== null ? String(r.score) : "-",
      r.totalQuestions !== null ? String(r.totalQuestions) : "-",
      r.percentage !== null ? `${r.percentage}%` : "-",
      r.passed !== null ? (r.passed ? "PASSED" : "FAILED") : "Pending",
      r.feedbackRating !== null ? `${r.feedbackRating}★` : "-",
      r.registeredAt ? new Date(r.registeredAt).toLocaleDateString() : "-"
    ].join("\t"));
  });

  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    return true;
  } catch (err) {
    console.error("Failed to copy department TSV data:", err);
    return false;
  }
}

/**
 * Prepares a structured multi-department payload with separate tab data for Google Sheets.
 */
export function buildMultiDepartmentPayload(
  registrations: EmployeeRegistration[],
  feedbacks: TrainingFeedback[],
  attempts: QuizAttempt[],
  trainings: Training[] = []
) {
  const allDepartments = getUniqueDepartments(trainings, registrations, attempts, feedbacks);
  const masterRecords = getDepartmentParticipantRecords("ALL", registrations, feedbacks, attempts, trainings);

  const departmentsMap: Record<string, any[]> = {};
  const summaryList: Array<{
    department: string;
    totalRegistered: number;
    quizzesCompleted: number;
    passedCount: number;
    failedCount: number;
    passRate: number;
    avgFeedback: number;
  }> = [];

  allDepartments.forEach((dept) => {
    const deptRecords = getDepartmentParticipantRecords(dept, registrations, feedbacks, attempts, trainings);
    departmentsMap[dept] = deptRecords.map((r) => ({
      employeeCode: r.employeeCode,
      employeeName: r.employeeName,
      department: r.department,
      designation: r.designation,
      trainingTitle: r.trainingTitle,
      trainerName: r.trainerName,
      trainingDate: r.trainingDate,
      quizStatus: r.quizStatus,
      score: r.score,
      totalQuestions: r.totalQuestions,
      percentage: r.percentage,
      passed: r.passed,
      feedbackRating: r.feedbackRating,
      registeredAt: r.registeredAt
    }));

    const quizzes = deptRecords.filter((r) => r.quizStatus === "Completed");
    const passed = deptRecords.filter((r) => r.passed === true);
    const failed = deptRecords.filter((r) => r.passed === false);
    const passRate = quizzes.length > 0 ? Math.round((passed.length / quizzes.length) * 100) : 0;
    const fbRatings = deptRecords.map((r) => r.feedbackRating).filter((v): v is number => v !== null);
    const avgFb = fbRatings.length > 0 ? Number((fbRatings.reduce((a, b) => a + b, 0) / fbRatings.length).toFixed(1)) : 0;

    summaryList.push({
      department: dept,
      totalRegistered: deptRecords.length,
      quizzesCompleted: quizzes.length,
      passedCount: passed.length,
      failedCount: failed.length,
      passRate,
      avgFeedback: avgFb
    });
  });

  return {
    action: "sync_all_departments",
    company: "Uttam (Bharat) Electricals Pvt. Ltd.",
    timestamp: new Date().toISOString(),
    totalCandidates: masterRecords.length,
    summary: summaryList,
    departments: departmentsMap,
    master: masterRecords.map((r) => ({
      employeeCode: r.employeeCode,
      employeeName: r.employeeName,
      department: r.department,
      designation: r.designation,
      trainingTitle: r.trainingTitle,
      quizStatus: r.quizStatus,
      score: r.score,
      totalQuestions: r.totalQuestions,
      percentage: r.percentage,
      passed: r.passed,
      feedbackRating: r.feedbackRating,
      registeredAt: r.registeredAt
    }))
  };
}

/**
 * Ready-to-use Google Apps Script code to paste in Extensions > Apps Script of the user's Google Sheet.
 * This script automatically creates and populates Department-wise tabs and a Master Overview tab!
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * =========================================================================================
 * UTTAM (BHARAT) ELECTRICALS PVT. LTD. - LIVE GOOGLE SHEETS SYNCHRONIZATION SCRIPT
 * =========================================================================================
 * 
 * HOW TO SET UP (1 MINUTE STEP-BY-STEP):
 * 1. Open your Google Sheet (or create one at https://sheets.new)
 * 2. In the top menu, click: Extensions -> Apps Script
 * 3. Delete any existing code in Code.gs and PASTE THIS ENTIRE SCRIPT.
 * 4. Click the blue "Deploy" button (top right) -> "New deployment"
 * 5. Click the gear icon (Select type) -> choose "Web app"
 * 6. Set Description: "Uttam Bharat Live Sync"
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone"
 * 7. Click "Deploy", copy the "Web app URL", and paste it into Uttam Bharat Portal Settings!
 * =========================================================================================
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No POST body received. Please ensure the request sends JSON data in body."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var raw = e.postData.contents;
    var data;
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Invalid JSON format: " + parseErr.message
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Fallback if not container-bound: try by spreadsheetId or spreadsheetUrl if supplied
    if (!ss) {
      if (data.spreadsheetId) {
        try { ss = SpreadsheetApp.openById(data.spreadsheetId); } catch (_) {}
      } else if (data.spreadsheetUrl) {
        try { ss = SpreadsheetApp.openByUrl(data.spreadsheetUrl); } catch (_) {}
      }
    }

    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No active Google Spreadsheet found! Please ensure this script is placed inside your Google Sheet under Extensions -> Apps Script (or provide spreadsheetId)."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var sheetName = "Google Spreadsheet";
    try {
      sheetName = ss.getName();
    } catch (_) {}

    // Handle Test Connection ping
    if (data.action === "test_connection" || data.ping === true) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Connection test successful! Connected to '" + sheetName + "'.",
        spreadsheetName: sheetName,
        spreadsheetId: ss.getId(),
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var tabCount = 0;
    var totalRecCount = 0;

    // 1. Sync Department KPI Summary Tab
    if (data.summary && Array.isArray(data.summary)) {
      syncSummarySheet(ss, data.summary, data.timestamp);
      tabCount++;
    }

    // 2. Sync Master Sheet with All Records
    if (data.master && Array.isArray(data.master)) {
      syncTab(ss, "Master_All_Records", data.master);
      totalRecCount = data.master.length;
      tabCount++;
    }

    // 3. Sync Each Individual Department Tab
    if (data.departments && typeof data.departments === "object") {
      for (var deptName in data.departments) {
        var cleanTabName = sanitizeTabName(deptName);
        var deptRows = data.departments[deptName];
        syncTab(ss, cleanTabName, deptRows);
        tabCount++;
      }
    }

    // Commit changes immediately to spreadsheet
    SpreadsheetApp.flush();

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Successfully synchronized " + (data.totalCandidates || totalRecCount) + " records across " + tabCount + " tabs in '" + sheetName + "'.",
      spreadsheetName: sheetName,
      totalRecords: data.totalCandidates || totalRecCount,
      tabsUpdated: tabCount,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Script Execution Error: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = ss ? ss.getName() : "Unknown Spreadsheet";
  return ContentService.createTextOutput(JSON.stringify({
    status: "active",
    company: "Uttam (Bharat) Electricals Pvt. Ltd.",
    connectedSheet: sheetName,
    message: "Uttam Bharat Live Google Sheets Sync Webhook is running and ready for POST requests."
  })).setMimeType(ContentService.MimeType.JSON);
}

function sanitizeTabName(name) {
  if (!name) return "General";
  var clean = name.replace(/[:\\\\/?*\\[\\]]/g, "_").trim();
  if (clean.length > 28) clean = clean.substring(0, 28);
  return clean || "Department";
}

function safeSetValues(sheet, startRow, startCol, matrix, targetCols) {
  if (!matrix || matrix.length === 0) return;
  var cols = targetCols || 0;
  for (var r = 0; r < matrix.length; r++) {
    if (matrix[r].length > cols) cols = matrix[r].length;
  }
  var normalized = [];
  for (var i = 0; i < matrix.length; i++) {
    var row = matrix[i].slice();
    while (row.length < cols) {
      row.push("");
    }
    if (row.length > cols) {
      row = row.slice(0, cols);
    }
    normalized.push(row);
  }
  sheet.getRange(startRow, startCol, normalized.length, cols).setValues(normalized);
}

function syncSummarySheet(ss, summaryList, timestamp) {
  var sheet = ss.getSheetByName("Department_KPI_Summary");
  if (!sheet) {
    sheet = ss.insertSheet("Department_KPI_Summary", 0);
  } else {
    sheet.clear();
  }

  // Ensure gridlines are visible
  try {
    if (typeof sheet.setHiddenGridlines === "function") {
      sheet.setHiddenGridlines(false);
    }
  } catch (_) {}

  // 1. Title Banner (Row 1)
  var titleRow = ["UTTAM (BHARAT) ELECTRICALS - DEPARTMENT TRAINING, QUIZ, AND FEEDBACK", "", "", "", "", "", ""];
  
  // 2. Subtitle Banner (Row 2)
  var dateStr = timestamp ? new Date(timestamp).toLocaleString("en-IN") : new Date().toLocaleString("en-IN");
  var subtitleRow = ["Department-Wise Performance Summary & Analytics  |  Last Synced: " + dateStr, "", "", "", "", "", ""];
  
  // 3. Spacer (Row 3)
  var spacerRow = ["", "", "", "", "", "", ""];
  
  // 4. Headers (Row 4)
  var headers = ["Department Name", "Total Enrolled", "Quizzes Completed", "Passed", "Failed", "Pass Rate (%)", "Avg Feedback (1-5★)"];

  var topBlock = [titleRow, subtitleRow, spacerRow, headers];
  safeSetValues(sheet, 1, 1, topBlock, 7);

  // Format Row 1: Merged Title Banner
  var r1 = sheet.getRange(1, 1, 1, 7);
  r1.merge();
  r1.setFontWeight("bold")
    .setFontSize(14)
    .setBackground("#0F2942")
    .setFontColor("#FFFFFF")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 44);

  // Format Row 2: Subtitle Banner
  var r2 = sheet.getRange(2, 1, 1, 7);
  r2.merge();
  r2.setFontWeight("normal")
    .setFontSize(10)
    .setBackground("#1E3A8A")
    .setFontColor("#E0E7FF")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(2, 24);

  // Format Row 3: Spacer
  sheet.setRowHeight(3, 10);

  // Format Row 4: Column Headers
  var r4 = sheet.getRange(4, 1, 1, 7);
  r4.setFontWeight("bold")
    .setFontSize(11)
    .setBackground("#2563EB")
    .setFontColor("#FFFFFF")
    .setVerticalAlignment("middle")
    .setHorizontalAlignment("center");
  sheet.getRange(4, 1).setHorizontalAlignment("left");
  sheet.setRowHeight(4, 32);

  var rows = [];
  var totEnrolled = 0;
  var totCompleted = 0;
  var totPassed = 0;
  var totFailed = 0;
  var feedbackSum = 0;
  var feedbackCount = 0;

  for (var i = 0; i < summaryList.length; i++) {
    var s = summaryList[i];
    var enr = s.totalRegistered || 0;
    var cmp = s.quizzesCompleted || 0;
    var pas = s.passedCount || 0;
    var fai = s.failedCount || 0;
    var fb = parseFloat(s.avgFeedback) || 0;

    totEnrolled += enr;
    totCompleted += cmp;
    totPassed += pas;
    totFailed += fai;
    if (fb > 0) {
      feedbackSum += fb;
      feedbackCount++;
    }

    rows.push([
      s.department || "General",
      enr,
      cmp,
      pas,
      fai,
      (s.passRate || 0) + "%",
      (s.avgFeedback || 0) + " ★"
    ]);
  }

  if (rows.length === 0) {
    rows.push(["No department data available yet", 0, 0, 0, 0, "0%", "0 ★"]);
  } else {
    var overallPassRate = totCompleted > 0 ? Math.round((totPassed / totCompleted) * 100) : 0;
    var overallAvgFb = feedbackCount > 0 ? (feedbackSum / feedbackCount).toFixed(1) : "0.0";
    rows.push([
      "★ OVERALL COMPANY TOTAL",
      totEnrolled,
      totCompleted,
      totPassed,
      totFailed,
      overallPassRate + "%",
      overallAvgFb + " ★"
    ]);
  }

  safeSetValues(sheet, 5, 1, rows, 7);

  // Styling Data Rows & Zebra Striping
  for (var k = 0; k < rows.length; k++) {
    var rowIdx = 5 + k;
    sheet.setRowHeight(rowIdx, 26);
    var rowRange = sheet.getRange(rowIdx, 1, 1, 7);
    rowRange.setVerticalAlignment("middle");

    // Total Row highlighting
    if (k === rows.length - 1 && rows.length > 1) {
      rowRange.setFontWeight("bold")
              .setBackground("#EEF2FF")
              .setFontColor("#1E3A8A");
      sheet.getRange(rowIdx, 1).setHorizontalAlignment("left");
      sheet.getRange(rowIdx, 2, 1, 6).setHorizontalAlignment("center");
    } else {
      if (k % 2 === 1) {
        rowRange.setBackground("#F8FAFC");
      } else {
        rowRange.setBackground("#FFFFFF");
      }
      sheet.getRange(rowIdx, 1).setHorizontalAlignment("left");
      sheet.getRange(rowIdx, 2, 1, 6).setHorizontalAlignment("center");

      // Pass rate coloring
      var passCell = sheet.getRange(rowIdx, 6);
      var passVal = parseInt(rows[k][5], 10) || 0;
      if (passVal >= 70) {
        passCell.setFontColor("#047857").setFontWeight("bold");
      } else if (passVal > 0) {
        passCell.setFontColor("#B91C1C").setFontWeight("bold");
      }
    }
  }

  // Elegant Grid Borders
  sheet.getRange(4, 1, rows.length + 1, 7).setBorder(true, true, true, true, true, true, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);

  sheet.setFrozenRows(4);

  // Proportional Column Widths
  sheet.setColumnWidth(1, 240); // Department Name
  sheet.setColumnWidth(2, 130); // Total Enrolled
  sheet.setColumnWidth(3, 150); // Quizzes Completed
  sheet.setColumnWidth(4, 100); // Passed
  sheet.setColumnWidth(5, 100); // Failed
  sheet.setColumnWidth(6, 130); // Pass Rate (%)
  sheet.setColumnWidth(7, 160); // Avg Feedback

  try {
    ss.setActiveSheet(sheet);
  } catch (_) {}
}

function syncTab(ss, tabName, records) {
  if (!records || !Array.isArray(records)) return;

  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  } else {
    sheet.clear();
  }

  try {
    if (typeof sheet.setHiddenGridlines === "function") {
      sheet.setHiddenGridlines(false);
    }
  } catch (_) {}

  var isMaster = (tabName === "Master_All_Records");
  var displayTitle = isMaster
    ? "UTTAM (BHARAT) ELECTRICALS - MASTER CANDIDATE DIRECTORY (ALL DEPARTMENTS)"
    : "UTTAM (BHARAT) ELECTRICALS - " + tabName.replace(/_/g, " ").toUpperCase() + " DEPARTMENT RECORDS";

  var titleRow = [displayTitle, "", "", "", "", "", "", "", "", "", "", ""];
  var subtitleRow = ["Total Registered Candidates: " + records.length + "  |  Training, Quiz Evaluation & Feedback Details", "", "", "", "", "", "", "", "", "", "", ""];
  var spacerRow = ["", "", "", "", "", "", "", "", "", "", "", ""];

  var headers = [
    "Employee Code",
    "Employee Name",
    "Department",
    "Designation",
    "Training Topic",
    "Quiz Status",
    "Score",
    "Total Questions",
    "Percentage",
    "Result",
    "Feedback Rating",
    "Registered At"
  ];

  var topBlock = [titleRow, subtitleRow, spacerRow, headers];
  safeSetValues(sheet, 1, 1, topBlock, 12);

  // Row 1: Banner
  var r1 = sheet.getRange(1, 1, 1, 12);
  r1.merge();
  r1.setFontWeight("bold")
    .setFontSize(13)
    .setBackground("#0F2942")
    .setFontColor("#FFFFFF")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 40);

  // Row 2: Subtitle
  var r2 = sheet.getRange(2, 1, 1, 12);
  r2.merge();
  r2.setFontWeight("normal")
    .setFontSize(10)
    .setBackground("#1E3A8A")
    .setFontColor("#E0E7FF")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(2, 22);

  // Row 3: Spacer
  sheet.setRowHeight(3, 8);

  // Row 4: Table Headers
  var r4 = sheet.getRange(4, 1, 1, 12);
  r4.setFontWeight("bold")
    .setFontSize(10.5)
    .setBackground("#2563EB")
    .setFontColor("#FFFFFF")
    .setVerticalAlignment("middle")
    .setHorizontalAlignment("center");
  sheet.setRowHeight(4, 30);

  var tableData = [];
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    tableData.push([
      r.employeeCode || "-",
      r.employeeName || "-",
      r.department || "-",
      r.designation || "-",
      r.trainingTitle || "-",
      r.quizStatus || "Pending",
      r.score !== null && r.score !== undefined ? r.score : "-",
      r.totalQuestions !== null && r.totalQuestions !== undefined ? r.totalQuestions : "-",
      r.percentage !== null && r.percentage !== undefined ? r.percentage + "%" : "-",
      r.passed === true ? "PASSED" : (r.passed === false ? "FAILED" : "Pending"),
      r.feedbackRating !== null && r.feedbackRating !== undefined ? r.feedbackRating + " ★" : "-",
      r.registeredAt ? r.registeredAt : "-"
    ]);
  }

  if (tableData.length === 0) {
    tableData.push(["-", "No candidate records registered", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"]);
  }

  safeSetValues(sheet, 5, 1, tableData, 12);

  // Format data rows
  for (var j = 0; j < tableData.length; j++) {
    var rowNum = 5 + j;
    sheet.setRowHeight(rowNum, 25);
    var rowR = sheet.getRange(rowNum, 1, 1, 12);
    rowR.setVerticalAlignment("middle");

    if (j % 2 === 1) {
      rowR.setBackground("#F8FAFC");
    } else {
      rowR.setBackground("#FFFFFF");
    }

    // Alignments
    sheet.getRange(rowNum, 1).setHorizontalAlignment("center"); // Emp Code
    sheet.getRange(rowNum, 2).setHorizontalAlignment("left");   // Name
    sheet.getRange(rowNum, 3).setHorizontalAlignment("left");   // Dept
    sheet.getRange(rowNum, 4).setHorizontalAlignment("left");   // Desig
    sheet.getRange(rowNum, 5).setHorizontalAlignment("left");   // Topic
    sheet.getRange(rowNum, 6, 1, 7).setHorizontalAlignment("center"); // Status, score, result, feedback, date

    // Result color coding
    var resCell = sheet.getRange(rowNum, 10);
    var resText = tableData[j][9];
    if (resText === "PASSED") {
      resCell.setFontColor("#047857").setFontWeight("bold");
    } else if (resText === "FAILED") {
      resCell.setFontColor("#B91C1C").setFontWeight("bold");
    }
  }

  // Border
  sheet.getRange(4, 1, tableData.length + 1, 12).setBorder(true, true, true, true, true, true, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);

  sheet.setFrozenRows(4);

  // Proportional Column Widths
  sheet.setColumnWidth(1, 120); // Emp Code
  sheet.setColumnWidth(2, 180); // Emp Name
  sheet.setColumnWidth(3, 160); // Department
  sheet.setColumnWidth(4, 150); // Designation
  sheet.setColumnWidth(5, 220); // Topic
  sheet.setColumnWidth(6, 110); // Quiz Status
  sheet.setColumnWidth(7, 80);  // Score
  sheet.setColumnWidth(8, 110); // Total Questions
  sheet.setColumnWidth(9, 100); // Percentage
  sheet.setColumnWidth(10, 95); // Result
  sheet.setColumnWidth(11, 130); // Feedback
  sheet.setColumnWidth(12, 160); // Registered At
}
`;

