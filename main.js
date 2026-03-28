import express, { response } from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
  check_manual_message,
  check_time_limit,
  get_full_customer,
  start_ai_process,
  send_expense_reminders,
} from "./flow_funcations.js";
import { sendMonthlyReports } from "./generate_report.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: ".env" });

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());
app.use("/reports", express.static(path.join(__dirname, "reports")));

app.post("/webhook/get_expence", async (req, res) => {
  res.sendStatus(200);
  try {
    // check if manual_message
    const customerNumber = req.body.customerNumber;
    const text_msg = req.body.text;

    const manual_check = await check_manual_message(text_msg, customerNumber);
    if (manual_check) {
      return;
    }

    const customer_info = await get_full_customer(customerNumber);

    const check_limit = await check_time_limit(customer_info, customerNumber);

    if (check_limit == true) {
      return;
    }

    const AI_inferencing = await start_ai_process(
      customer_info,
      text_msg,
      customerNumber,
    );
  } catch (err) {
    console.log(err, "ERR");
  }
});

// check every minute if it's time to send monthly reports
// triggers on last day of month at 8:30 PM IST (3:00 PM UTC)
let monthlyReportSent = false;

function checkMonthlyReportSchedule() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const today = now.getUTCDate();
  const lastDayOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();

  // 8:30 PM IST = 3:00 PM UTC (15:00)
  if (today === lastDayOfMonth && utcHour === 15 && utcMinute === 0) {
    if (!monthlyReportSent) {
      monthlyReportSent = true;
      console.log("Triggering monthly reports...");
      sendMonthlyReports().catch((err) => console.log("Monthly report error:", err));
    }
  } else {
    // reset flag so it can fire next month
    monthlyReportSent = false;
  }
}

app.listen(PORT, () => {
  console.log(`App Started at http://localhost:${PORT}`);
  setInterval(send_expense_reminders, 10 * 60 * 1000); // run every 10 minutes
  setInterval(checkMonthlyReportSchedule, 60 * 1000); // check every minute
});
