import mongoose from "mongoose";
import ExcelJS from "exceljs";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Expense, User } from "./custom_variables.js";

dotenv.config({ path: ".env" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGET_USER_ID = "00000001";
const SERVER_URL = process.env.SERVER_URL || "http://43.205.178.165:3000";

// brand colors
const PRIMARY = "1B5E20";    // dark green
const ACCENT = "4CAF50";     // green
const LIGHT_BG = "F1F8E9";   // light green tint
const WHITE = "FFFFFF";
const DARK_TEXT = "212121";
const GRAY_TEXT = "757575";
const RED = "D32F2F";
const GREEN = "2E7D32";

async function generateMonthlyReport(userId) {
  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({ user_id: userId });
  if (!user) throw new Error(`User ${userId} not found`);

  // get current month range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const monthName = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

  const expenses = await Expense.find({
    user_id: userId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  }).sort({ date: 1 });

  if (expenses.length === 0) {
    console.log(`No transactions found for user ${userId} in ${monthName}`);
    await mongoose.disconnect();
    return null;
  }

  // ── build workbook ──
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

  // column widths
  ws.columns = [
    { width: 6 },   // A — #
    { width: 14 },  // B — Date
    { width: 14 },  // C — Type
    { width: 20 },  // D — Category
    { width: 14 },  // E — Amount
    { width: 36 },  // F — Description
  ];

  // ── Header banner ──
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

  ws.addRow([]); // spacer

  // ── Table header ──
  const headers = ["#", "Date", "Type", "Category", "Amount (₹)", "Description"];
  const headerRow = ws.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: PRIMARY } },
    };
  });

  // ── Data rows ──
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
      cell.border = {
        bottom: { style: "hair", color: { argb: "E0E0E0" } },
      };

      // color the type column
      if (colNum === 3) {
        cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: isExpense ? RED : GREEN } };
      }
      // amount formatting
      if (colNum === 5) {
        cell.numFmt = "#,##0.00";
        cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: isExpense ? RED : GREEN } };
      }
    });
  });

  // ── Totals row ──
  ws.addRow([]); // spacer
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

  // aggregate by category (expenses only)
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

  // ── footer ──
  catSheet.addRow([]);
  const footerRow = catSheet.addRow(["", "Generated by ReSave"]);
  catSheet.mergeCells(`B${footerRow.number}:E${footerRow.number}`);
  footerRow.getCell(2).font = { name: "Calibri", size: 9, italic: true, color: { argb: GRAY_TEXT } };
  footerRow.getCell(2).alignment = { horizontal: "center" };

  // ── save file ──
  const fileName = `ReSave_${userId}_${monthName.replace(" ", "_")}.xlsx`;
  const filePath = path.join(__dirname, "reports", fileName);

  // ensure reports dir exists
  const fs = await import("fs");
  if (!fs.existsSync(path.join(__dirname, "reports"))) {
    fs.mkdirSync(path.join(__dirname, "reports"));
  }

  await workbook.xlsx.writeFile(filePath);
  console.log(`Report saved: ${filePath}`);

  return { filePath, fileName, phoneNumber: user.phone_number, totalExpense, totalIncome };
}

async function sendReportViaWhatsApp(phoneNumber, fileName, monthName, totalExpense, totalIncome, net) {
  const fileUrl = `${SERVER_URL}/reports/${encodeURIComponent(fileName)}`;

  const msg = `📊 *Your ${monthName} Report is Ready!* — 💰 Income: ₹${totalIncome.toLocaleString("en-IN")} | 💸 Expense: ₹${totalExpense.toLocaleString("en-IN")} | ${net >= 0 ? "✅" : "🔴"} Net Savings: ₹${net.toLocaleString("en-IN")} — 📥 Download here: ${fileUrl}`;

  const { data } = await axios.post(
    "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
    {
      integrated_number: process.env.WHATSAPP_INTEGRATED_NUMBER,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: "response_from_server",
          language: { code: "en", policy: "deterministic" },
          namespace: "329a6d81_daa5_4230_b0f3_c953f5f75b28",
          to_and_components: [
            {
              to: [phoneNumber],
              components: {
                body_value_1: {
                  type: "text",
                  value: msg,
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

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const result = await generateMonthlyReport(TARGET_USER_ID);
  if (!result) {
    await mongoose.disconnect();
    return;
  }

  const now = new Date();
  const monthName = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

  const net = result.totalIncome - result.totalExpense;
  await sendReportViaWhatsApp(result.phoneNumber, result.fileName, monthName, result.totalExpense, result.totalIncome, net);

  await mongoose.disconnect();
  console.log("Done!");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
