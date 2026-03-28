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
    { width: 6 },
    { width: 14 },
    { width: 14 },
    { width: 20 },
    { width: 14 },
    { width: 36 },
  ];

  const titleRow = ws.addRow(["  ReSave — Monthly Expense Report"]);
  ws.mergeCells("A1:F1");
  titleRow.height = 42;
  titleRow.getCell(1).font = { name: "Calibri", size: 18, bold: true, color: { argb: WHITE } };
  titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY } };
  titleRow.getCell(1).alignment = { vertical: "middle" };

  const subRow = ws.addRow([`  ${monthName}  |  User: ${userId}  |  Phone: ${user.phone_number}`]);
  ws.mergeCells("A2:F2");
  subRow.height = 28;
  subRow.getCell(1).font = { name: "Calibri", size: 11, color: { argb: WHITE } };
  subRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT } };
  subRow.getCell(1).alignment = { vertical: "middle" };

  ws.addRow([]);

  const headers = ["#", "Date", "Type", "Category", "Amount (₹)", "Description"];
  const headerRow = ws.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: { style: "thin", color: { argb: PRIMARY } } };
  });

  let totalExpense = 0;
  let totalIncome = 0;

  expenses.forEach((exp, i) => {
    const isExpense = exp.transaction === "Expense";
    if (isExpense) totalExpense += exp.amount;
    else totalIncome += exp.amount;

    const row = ws.addRow([
      i + 1,
      new Date(exp.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      exp.transaction,
      exp.category,
      exp.amount,
      exp.desp || "—",
    ]);

    const bgColor = i % 2 === 0 ? WHITE : LIGHT_BG;
    row.eachCell((cell, colNum) => {
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
    });
  });

  ws.addRow([]);
  const net = totalIncome - totalExpense;

  const summaryData = [
    ["Total Income", totalIncome, GREEN],
    ["Total Expense", totalExpense, RED],
    ["Net Savings", net, net >= 0 ? GREEN : RED],
  ];

  summaryData.forEach(([label, value, color]) => {
    const row = ws.addRow(["", "", "", label, value, ""]);
    row.getCell(4).font = { name: "Calibri", size: 11, bold: true, color: { argb: DARK_TEXT } };
    row.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(5).numFmt = "#,##0.00";
    row.getCell(5).font = { name: "Calibri", size: 12, bold: true, color: { argb: color } };
    row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(5).border = { bottom: { style: "thin", color: { argb: "BDBDBD" } } };
  });

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

  const categoryMap = {};
  expenses.filter((e) => e.transaction === "Expense").forEach((e) => {
    if (!categoryMap[e.category]) categoryMap[e.category] = { total: 0, count: 0 };
    categoryMap[e.category].total += e.amount;
    categoryMap[e.category].count += 1;
  });

  const sorted = Object.entries(categoryMap).sort((a, b) => b[1].total - a[1].total);

  sorted.forEach(([cat, data], i) => {
    const pct = totalExpense > 0 ? ((data.total / totalExpense) * 100).toFixed(1) : "0.0";
    const row = catSheet.addRow([i + 1, cat, data.count, data.total, `${pct}%`]);
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
                header: {
                  type: "document",
                  document: {
                    link: fileUrl,
                    filename: fileName,
                  },
                },
                body_value_1: {
                  type: "text",
                  value: monthName,
                  parameter_name: "value_1",
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

export async function handleReportCommand(customerNumber, userId) {
  const result = await generateMonthlyReport(userId);
  if (!result) {
    const { WhatsappResponse } = await import("./whatappapi.js");
    await WhatsappResponse(customerNumber, "No transactions found for this month yet. Start logging your expenses and try again!");
    return;
  }

  await sendReportWhatsApp(customerNumber, result.fileName, result.monthName);

  // auto-delete file after 5 minutes
  scheduleDelete(result.filePath);
}
