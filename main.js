import express, { response } from "express";
import dotenv from "dotenv";
import {
  check_manual_message,
  check_time_limit,
  get_full_customer,
  start_ai_process,
} from "./flow_funcations.js";

dotenv.config({ path: ".env" });

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.post("/webhook/get_expence", async (req, res) => {
  res.sendStatus(200);
  try {
    // check if manual_message
    const customerNumber = req.body.customerNumber;
    const text_msg = req.body.text;

    const manual_check = check_manual_message(text_msg, customerNumber);
    if (manual_check) {
      return;
    }

    const customer_info = await get_full_customer();

    const check_limit = await check_time_limit(customer_info);

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

app.listen(PORT, () => {
  console.log(`App Started at http://localhost:${PORT}`);
});
