import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { QuizAttempt, EmployeeRegistration, TrainingFeedback, Training } from "../types";
import { getUttamLogoPngDataUrl } from "./logoAsset";

/**
 * Generates an official, print-ready Certificate of Technical Excellence PDF
 * featuring the official Uttam (Bharat) Electricals trademark logo and matching
 * corporate Transformer Electric Blue (#009fe3) & Industrial Slate theme.
 */
export async function generateCertificatePdf(
  attempt: QuizAttempt,
  registration: EmployeeRegistration,
  training: Training
): Promise<void> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Outer Border & Decorative Frame - Uttam Charcoal (#2B2A28 -> RGB: 43, 42, 40)
  doc.setLineWidth(1.8);
  doc.setDrawColor(43, 42, 40);
  doc.rect(8, 8, width - 16, height - 16);

  // Inset Accent Frame - Official Uttam Blue (#008DD2 -> RGB: 0, 141, 210)
  doc.setLineWidth(0.8);
  doc.setDrawColor(0, 141, 210);
  doc.rect(12, 12, width - 24, height - 24);

  // Corner Geometric Accents (Matching transformer engineering aesthetic)
  const drawCornerAccent = (x: number, y: number, dx: number, dy: number) => {
    doc.setLineWidth(1.2);
    doc.setDrawColor(0, 141, 210);
    doc.line(x, y, x + dx * 7, y);
    doc.line(x, y, x, y + dy * 7);
  };
  drawCornerAccent(14, 14, 1, 1);
  drawCornerAccent(width - 14, 14, -1, 1);
  drawCornerAccent(14, height - 14, 1, -1);
  drawCornerAccent(width - 14, height - 14, -1, -1);

  // Subtle Top Decorative Background Tint
  doc.setFillColor(240, 249, 255); // Ice blue tint
  doc.rect(13, 13, width - 26, 32, "F");

  // Embed Official Trademark Logo (UTTAM® POWER AND DISTRIBUTION TRANSFORMERS)
  try {
    const logoPng = await getUttamLogoPngDataUrl(false, 3);
    if (logoPng) {
      const logoWidth = 72; // mm
      const logoHeight = (logoWidth * 135) / 480; // ~ 20.25 mm
      const logoX = (width - logoWidth) / 2;
      doc.addImage(logoPng, "PNG", logoX, 15, logoWidth, logoHeight);
    }
  } catch (err) {
    console.warn("Could not embed raster logo, falling back to vector text:", err);
    // Fallback company header
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("UTTAM (BHARAT) ELECTRICALS PVT. LTD.", width / 2, 24, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(0, 159, 227);
    doc.text("UTTAM®  •  POWER AND DISTRIBUTION TRANSFORMERS", width / 2, 31, { align: "center" });
  }

  // ISO Certification and Facility Sub-header
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("UTTAM (BHARAT) ELECTRICALS PVT. LTD.   •   ESTD 1983   •   ISO 9001:2015 CERTIFIED", width / 2, 40, { align: "center" });

  // Main Certificate Title
  doc.setTextColor(0, 159, 227);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("CERTIFICATE OF TECHNICAL EXCELLENCE", width / 2, 51, { align: "center" });

  // Accent divider line under title
  doc.setLineWidth(0.6);
  doc.setDrawColor(0, 159, 227);
  doc.line(width / 2 - 45, 54, width / 2 + 45, 54);

  // Certification preamble
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(11);
  doc.setFont("helvetica", "italic");
  doc.text("This is to proudly certify that", width / 2, 64, { align: "center" });

  // Employee Name (Prominent & High Contrast)
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(23);
  doc.text(registration.employeeName.toUpperCase(), width / 2, 77, { align: "center" });

  // Employee Details (Code, Department, Designation)
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Employee Code: ${registration.employeeCode}   •   Department: ${registration.department}   •   Designation: ${registration.designation}`,
    width / 2,
    86,
    { align: "center" }
  );

  // Accomplishment text
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text("has successfully completed the technical training evaluation and practical assessment in", width / 2, 97, { align: "center" });

  // Training Title Box (Electric Blue Tinted Container)
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.setLineWidth(0.5);
  doc.roundedRect(width / 2 - 95, 103, 190, 16, 3, 3, "FD");

  doc.setTextColor(3, 105, 161);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(training.title, width / 2, 114, { align: "center" });

  // Score & Training Date Summary
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Training Date: ${training.trainingDate}   •   Assessment Score: ${attempt.percentage}% (${attempt.score}/${attempt.totalQuestions})   •   Result: PASSED`,
    width / 2,
    128,
    { align: "center" }
  );

  // Verification ID
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const certId = `UB-CERT-${attempt.id.slice(0, 8).toUpperCase()}`;
  doc.text(`Certificate Verification ID: ${certId}`, width / 2, 137, { align: "center" });

  // Signatures Line Setup
  doc.setLineWidth(0.5);
  doc.setDrawColor(148, 163, 184);

  // Trainer Signature (Left)
  doc.line(38, 172, 98, 172);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(training.trainerName, 68, 178, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text("Technical Trainer / Evaluator", 68, 183, { align: "center" });

  // Official Uttam Quality Stamp (Center)
  doc.setDrawColor(0, 159, 227);
  doc.setLineWidth(1);
  doc.circle(width / 2, 166, 13);
  doc.setLineWidth(0.4);
  doc.setDrawColor(14, 165, 233);
  doc.circle(width / 2, 166, 10.5);
  
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 159, 227);
  doc.text("UTTAM", width / 2, 163, { align: "center" });
  doc.text("QUALITY SEAL", width / 2, 167, { align: "center" });
  doc.setFontSize(6);
  doc.text("TRANSFORMERS", width / 2, 171, { align: "center" });

  // Head HR / Director Signature (Right)
  doc.line(width - 98, 172, width - 38, 172);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Head - HR & Training", width - 68, 178, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text("Uttam (Bharat) Electricals Pvt. Ltd.", width - 68, 183, { align: "center" });

  // Footer text
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Official computer-generated technical training assessment certificate issued by Uttam (Bharat) Electricals Pvt. Ltd. • Transformers Division",
    width / 2,
    198,
    { align: "center" }
  );

  doc.save(`${registration.employeeCode}_${training.title.replace(/[^a-zA-Z0-9]/g, "_")}_Certificate.pdf`);
}

/**
 * Generates an administrative training summary report PDF
 */
export function generateTrainingSummaryReportPdf(
  training: Training,
  registrations: EmployeeRegistration[],
  feedbacks: TrainingFeedback[],
  attempts: QuizAttempt[]
): void {
  const doc = new jsPDF();

  // Company Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("UTTAM (BHARAT) ELECTRICALS PVT. LTD.", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 159, 227);
  doc.text("UTTAM® • POWER AND DISTRIBUTION TRANSFORMERS", 14, 24);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Training Assessment & Feedback Evaluation Report", 14, 31);

  // Metadata Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 36, 182, 28, 2, 2, "F");

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`Training: ${training.title}`, 18, 44);
  doc.text(`Department: ${training.department}`, 18, 51);
  doc.text(`Trainer: ${training.trainerName}`, 18, 58);

  doc.text(`Date: ${training.trainingDate}`, 120, 44);
  doc.text(`Total Attendees: ${registrations.length}`, 120, 51);
  const passedCount = attempts.filter((a) => a.passed).length;
  const passRate = attempts.length > 0 ? Math.round((passedCount / attempts.length) * 100) : 0;
  doc.text(`Pass Rate: ${passRate}% (${passedCount}/${attempts.length})`, 120, 58);

  // Table of Attendees & Scores
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Employee Assessment & Feedback Log", 14, 74);

  const tableData = registrations.map((reg) => {
    const fb = feedbacks.find((f) => f.registrationId === reg.id);
    const att = attempts.find((a) => a.registrationId === reg.id);

    const avgFb = fb
      ? (
          Object.values(fb.ratings).reduce((a, b) => a + b, 0) /
          Object.values(fb.ratings).length
        ).toFixed(1)
      : "N/A";

    return [
      reg.employeeCode,
      reg.employeeName,
      reg.department,
      reg.designation,
      avgFb,
      att ? `${att.score}/${att.totalQuestions} (${att.percentage}%)` : "Pending",
      att ? (att.passed ? "PASSED" : "FAILED") : "-"
    ];
  });

  autoTable(doc, {
    startY: 78,
    head: [["Emp Code", "Name", "Department", "Designation", "Avg Rating", "Quiz Score", "Status"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [0, 159, 227], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2 }
  });

  doc.save(`${training.title.replace(/[^a-zA-Z0-9]/g, "_")}_Report.pdf`);
}
