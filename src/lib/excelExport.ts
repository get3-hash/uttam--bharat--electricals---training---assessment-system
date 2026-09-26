import ExcelJS from "exceljs";
import { Training, EmployeeRegistration, TrainingFeedback, QuizAttempt } from "../types";

export async function exportTrainingReportToExcel(
  training: Training,
  registrations: EmployeeRegistration[],
  feedbacks: TrainingFeedback[],
  attempts: QuizAttempt[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Uttam (Bharat) Electricals Pvt. Ltd.";
  workbook.created = new Date();

  // Sheet 1: Summary & Attendance Log
  const summarySheet = workbook.addWorksheet("Attendance & Overview");

  summarySheet.columns = [
    { header: "Emp Code", key: "empCode", width: 14 },
    { header: "Employee Name", key: "empName", width: 22 },
    { header: "Department", key: "department", width: 18 },
    { header: "Designation", key: "designation", width: 20 },
    { header: "Email", key: "email", width: 24 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Registration Date", key: "regDate", width: 20 },
    { header: "Feedback Submitted", key: "feedbackSubmitted", width: 18 },
    { header: "Quiz Status", key: "quizStatus", width: 15 },
    { header: "Quiz Score", key: "quizScore", width: 12 },
    { header: "Percentage", key: "percentage", width: 14 },
    { header: "Result", key: "result", width: 12 }
  ];

  // Header row style
  const headerRow = summarySheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFF" }, name: "Calibri", size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "1E3A8A" } // Dark Navy
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  registrations.forEach((reg) => {
    const fb = feedbacks.find((f) => f.registrationId === reg.id);
    const att = attempts.find((a) => a.registrationId === reg.id);

    summarySheet.addRow({
      empCode: reg.employeeCode,
      empName: reg.employeeName,
      department: reg.department,
      designation: reg.designation,
      email: reg.email,
      phone: reg.phone,
      regDate: new Date(reg.registeredAt).toLocaleString(),
      feedbackSubmitted: fb ? "YES" : "NO",
      quizStatus: att ? "Completed" : "Pending",
      quizScore: att ? `${att.score}/${att.totalQuestions}` : "-",
      percentage: att ? `${att.percentage}%` : "-",
      result: att ? (att.passed ? "PASS" : "FAIL") : "-"
    });
  });

  // Sheet 2: Section A & B Feedback Details
  const feedbackSheet = workbook.addWorksheet("Feedback Analysis");
  feedbackSheet.columns = [
    { header: "Emp Code", key: "empCode", width: 14 },
    { header: "Employee Name", key: "empName", width: 20 },
    { header: "Objectives", key: "r1", width: 12 },
    { header: "Trainer Knowledge", key: "r2", width: 16 },
    { header: "Presentation", key: "r3", width: 14 },
    { header: "Communication", key: "r4", width: 15 },
    { header: "Q&A Interaction", key: "r5", width: 15 },
    { header: "Practical Session", key: "r6", width: 16 },
    { header: "Training Material", key: "r7", width: 16 },
    { header: "Overall Rating", key: "r8", width: 14 },
    { header: "Learnings", key: "learnings", width: 40 },
    { header: "Application Timeline", key: "timeline", width: 30 },
    { header: "Suggestions", key: "suggestions", width: 30 }
  ];

  const fbHeader = feedbackSheet.getRow(1);
  fbHeader.font = { bold: true, color: { argb: "FFFFFF" } };
  fbHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2563EB" } };

  feedbacks.forEach((fb) => {
    feedbackSheet.addRow({
      empCode: fb.employeeCode,
      empName: fb.employeeName,
      r1: fb.ratings.objectivesCovered,
      r2: fb.ratings.trainerKnowledge,
      r3: fb.ratings.presentationDelivery,
      r4: fb.ratings.communicationClarity,
      r5: fb.ratings.interactionQa,
      r6: fb.ratings.practicalSession,
      r7: fb.ratings.trainingMaterial,
      r8: fb.ratings.overallExperience,
      learnings: fb.learnings.filter(Boolean).join(" | "),
      timeline: fb.applicationTimeline,
      suggestions: fb.suggestions
    });
  });

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${training.title.replace(/[^a-zA-Z0-9]/g, "_")}_Full_Analytics.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
