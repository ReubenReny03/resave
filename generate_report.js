import ExcelJS from "exceljs";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Expense, User } from "./custom_variables.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_URL = process.env.SERVER_URL || "http://43.205.178.165:3000";
const REPORTS_DIR = path.join(__dirname, "reports");

// brand colors
const PRIMARY = "1B5E20";
const ACCENT = "4CAF50";
const LIGHT_BG = "F1F8E9";
const WHITE = "FFFFFF";
const DARK_TEXT = "212121";
const GRAY_TEXT = "757575";
const RED = "D32F2F";
const GREEN = "2E7D32";

function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR);
}

function scheduleDelete(filePath, delayMs = 5 * 60 * 1000) {
  setTimeout(() => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted report: ${filePath}`);
      }
    } catch (err) {
      console.log("Failed to delete report:", err.message);
    }
  }, delayMs);
}

function styleDataCell(cell, colNum, bgColor, isExpense) {
  cell.font = { name: "Calibri", size: 10.5, color: { argb: DARK_TEXT } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
  cell.alignment = { vertical: "middle", horizontal: colNum === 6 ? "left" : "center" };
  cell.border = { bottom: { style: "hair", color: { argb: "E0E0E0" } } };
  if (colNum === 3) {
    cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: isExpense ? RED : GREEN } };
  }
  if (colNum === 5) {
    cell.numFmt = "#,##0.00";
    cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: isExpense ? RED : GREEN } };
  }
}

async function generateMonthlyReport(userId) {
  const user = await User.findOne({ user_id: userId });
  if (!user) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const monthName = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

  const expenses = await Expense.find({
    user_id: userId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  }).sort({ date: 1 });

  if (expenses.length === 0) return null;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ReSave";
  workbook.created = new Date();

  // ═══════════════════════════════════════
  //  SHEET 1 — Transactions
  // ═══════════════════════════════════════
  const ws = workbook.addWorksheet("Transactions", {
    properties: { defaultColWidth: 18 },
    views: [{ showGridLines: false }],
  });

  ws.columns = [
    { width: 6 },   // A — #
    { width: 14 },  // B — Date
    { width: 14 },  // C — Type
    { width: 20 },  // D — Category
    { width: 14 },  // E — Amount
    { width: 36 },  // F — Description
  ];

  // Row 1 — title banner
  const titleRow = ws.addRow(["  ReSave — Monthly Expense Report"]);
  ws.mergeCells("A1:F1");
  titleRow.height = 42;
  titleRow.getCell(1).font = { name: "Calibri", size: 18, bold: true, color: { argb: WHITE } };
  titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY } };
  titleRow.getCell(1).alignment = { vertical: "middle" };

  // Row 2 — sub header
  const subRow = ws.addRow([`  ${monthName}  |  User: ${userId}  |  Phone: ${user.phone_number}`]);
  ws.mergeCells("A2:F2");
  subRow.height = 28;
  subRow.getCell(1).font = { name: "Calibri", size: 11, color: { argb: WHITE } };
  subRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT } };
  subRow.getCell(1).alignment = { vertical: "middle" };

  // Row 3 — spacer
  ws.addRow([]);

  // Row 4 — table header
  const headers = ["#", "Date", "Type", "Category", "Amount (₹)", "Description"];
  const headerRow = ws.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: { style: "thin", color: { argb: PRIMARY } } };
  });

  // Data rows start at row 5
  const dataStartRow = 5;

  expenses.forEach((exp, i) => {
    const isExpense = exp.transaction === "Expense";
    const row = ws.addRow([
      i + 1,
      new Date(exp.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      exp.transaction,
      exp.category,
      exp.amount,
      exp.desp || "—",
    ]);

    const bgColor = i % 2 === 0 ? WHITE : LIGHT_BG;
    row.eachCell((cell, colNum) => styleDataCell(cell, colNum, bgColor, isExpense));
  });

  const dataEndRow = dataStartRow + expenses.length - 1;

  // Leave 10 blank rows for user to add more data manually
  const extraRows = 10;
  for (let i = 0; i < extraRows; i++) {
    const row = ws.addRow(["", "", "", "", "", ""]);
    const bgColor = (expenses.length + i) % 2 === 0 ? WHITE : LIGHT_BG;
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.border = { bottom: { style: "hair", color: { argb: "E0E0E0" } } };
      cell.font = { name: "Calibri", size: 10.5, color: { argb: DARK_TEXT } };
    });
    row.getCell(5).numFmt = "#,##0.00";
  }

  const lastPossibleRow = dataEndRow + extraRows;

  // Spacer
  ws.addRow([]);
  const summaryStartRow = lastPossibleRow + 2;

  // FORMULAS — these use SUMIF so they auto-update if user adds rows
  const amountRange = `E${dataStartRow}:E${lastPossibleRow}`;
  const typeRange = `C${dataStartRow}:C${lastPossibleRow}`;

  // Total Income row
  const incomeRow = ws.getRow(summaryStartRow);
  incomeRow.getCell(4).value = "Total Income";
  incomeRow.getCell(4).font = { name: "Calibri", size: 11, bold: true, color: { argb: DARK_TEXT } };
  incomeRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
  incomeRow.getCell(5).value = { formula: `SUMIF(${typeRange},"Income",${amountRange})` };
  incomeRow.getCell(5).numFmt = "#,##0.00";
  incomeRow.getCell(5).font = { name: "Calibri", size: 12, bold: true, color: { argb: GREEN } };
  incomeRow.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
  incomeRow.getCell(5).border = { bottom: { style: "thin", color: { argb: "BDBDBD" } } };

  // Total Expense row
  const expenseRow = ws.getRow(summaryStartRow + 1);
  expenseRow.getCell(4).value = "Total Expense";
  expenseRow.getCell(4).font = { name: "Calibri", size: 11, bold: true, color: { argb: DARK_TEXT } };
  expenseRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
  expenseRow.getCell(5).value = { formula: `SUMIF(${typeRange},"Expense",${amountRange})` };
  expenseRow.getCell(5).numFmt = "#,##0.00";
  expenseRow.getCell(5).font = { name: "Calibri", size: 12, bold: true, color: { argb: RED } };
  expenseRow.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
  expenseRow.getCell(5).border = { bottom: { style: "thin", color: { argb: "BDBDBD" } } };

  // Net Savings row (Income - Expense)
  const netRow = ws.getRow(summaryStartRow + 2);
  netRow.getCell(4).value = "Net Savings";
  netRow.getCell(4).font = { name: "Calibri", size: 11, bold: true, color: { argb: DARK_TEXT } };
  netRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
  netRow.getCell(5).value = { formula: `E${summaryStartRow}-E${summaryStartRow + 1}` };
  netRow.getCell(5).numFmt = "#,##0.00";
  netRow.getCell(5).font = { name: "Calibri", size: 12, bold: true, color: { argb: GREEN } };
  netRow.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
  netRow.getCell(5).border = { bottom: { style: "double", color: { argb: PRIMARY } } };

  // ═══════════════════════════════════════
  //  SHEET 2 — Category Summary
  // ═══════════════════════════════════════
  const catSheet = workbook.addWorksheet("Category Summary", {
    views: [{ showGridLines: false }],
  });

  catSheet.columns = [
    { width: 6 },
    { width: 24 },
    { width: 16 },
    { width: 14 },
    { width: 16 },
  ];

  const catTitle = catSheet.addRow(["  Category Breakdown"]);
  catSheet.mergeCells("A1:E1");
  catTitle.height = 38;
  catTitle.getCell(1).font = { name: "Calibri", size: 16, bold: true, color: { argb: WHITE } };
  catTitle.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY } };
  catTitle.getCell(1).alignment = { vertical: "middle" };

  catSheet.addRow([]);

  const catHeaders = ["#", "Category", "Transactions", "Total (₹)", "% of Spend"];
  const catHeaderRow = catSheet.addRow(catHeaders);
  catHeaderRow.height = 26;
  catHeaderRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // aggregate by category (expenses only)
  const categoryMap = {};
  expenses.filter((e) => e.transaction === "Expense").forEach((e) => {
    if (!categoryMap[e.category]) categoryMap[e.category] = { total: 0, count: 0 };
    categoryMap[e.category].total += e.amount;
    categoryMap[e.category].count += 1;
  });

  const sorted = Object.entries(categoryMap).sort((a, b) => b[1].total - a[1].total);
  const catDataStartRow = 4; // row after header

  sorted.forEach(([cat, data], i) => {
    const rowNum = catDataStartRow + i;
    const row = catSheet.addRow([i + 1, cat, data.count, data.total, ""]);
    // % formula: this category's total / sum of all category totals
    row.getCell(5).value = { formula: `IF(D${rowNum}=0,"0.0%",TEXT(D${rowNum}/SUM(D${catDataStartRow}:D${catDataStartRow + sorted.length - 1})*100,"0.0")&"%")` };

    const bgColor = i % 2 === 0 ? WHITE : LIGHT_BG;
    row.eachCell((cell, colNum) => {
      cell.font = { name: "Calibri", size: 10.5, color: { argb: DARK_TEXT } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = { bottom: { style: "hair", color: { argb: "E0E0E0" } } };
      if (colNum === 4) cell.numFmt = "#,##0.00";
    });
  });

  catSheet.addRow([]);
  const footerRow = catSheet.addRow(["", "Generated by ReSave"]);
  catSheet.mergeCells(`B${footerRow.number}:E${footerRow.number}`);
  footerRow.getCell(2).font = { name: "Calibri", size: 9, italic: true, color: { argb: GRAY_TEXT } };
  footerRow.getCell(2).alignment = { horizontal: "center" };

  // save file
  const timestamp = Date.now();
  const fileName = `ReSave_${userId}_${monthName.replace(" ", "_")}_${timestamp}.xlsx`;
  const filePath = path.join(REPORTS_DIR, fileName);

  ensureReportsDir();
  await workbook.xlsx.writeFile(filePath);
  console.log(`Report saved: ${filePath}`);

  return { filePath, fileName, monthName };
}

async function sendReportWhatsApp(phoneNumber, fileName, monthName) {
  const fileUrl = `${SERVER_URL}/reports/${encodeURIComponent(fileName)}`;
  console.log(`Sending report to ${phoneNumber}: ${fileUrl}`);

  const { data } = await axios.post(
    "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
    {
      integrated_number: process.env.WHATSAPP_INTEGRATED_NUMBER,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: "monthly_report",
          language: { code: "en", policy: "deterministic" },
          namespace: "329a6d81_daa5_4230_b0f3_c953f5f75b28",
          to_and_components: [
            {
              to: [phoneNumber],
              components: {
                header_1: {
                  filename: fileName,
                  type: "document",
                  value: fileUrl,
                },
                body_1: {
                  type: "text",
                  value: monthName,
                },
              },
            },
          ],
        },
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        authkey: process.env.MSG91_TOKEN,
      },
    }
  );

  console.log("MSG91 response:", data);
  return data;
}

export async function sendMonthlyReports() {
  console.log("Starting monthly report generation...");
  const { WhatsappResponse } = await import("./whatappapi.js");

  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  const activeUsers = await User.find({ last_used: { $gte: sixDaysAgo } });

  console.log(`Found ${activeUsers.length} active users in last 6 days`);

  for (const user of activeUsers) {
    try {
      const result = await generateMonthlyReport(user.user_id);
      if (!result) {
        console.log(`No data for user ${user.user_id}, skipping`);
        continue;
      }

      await sendReportWhatsApp(user.phone_number, result.fileName, result.monthName);

      // follow-up personal message after a short delay
      await new Promise((r) => setTimeout(r, 3000));
      await WhatsappResponse(
        user.phone_number,
        `Hey its me Reuben, hope you had a good day! Look into the report I just sent — I have added some blank space so if you forgot to add something you can fill it in. You can add your income too to see your net savings. So take some time off and look into your spendings, maybe open your UPI and fill in the missing things. This excel is just with you, no one else can see it.`
      );

      // auto-delete file after 5 minutes
      scheduleDelete(result.filePath);

      console.log(`Report sent to user ${user.user_id}`);
    } catch (err) {
      console.log(`Failed for user ${user.user_id}:`, err.message);
    }
  }

  console.log("Monthly reports done!");
}
