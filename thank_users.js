import dotenv from "dotenv";
import mongoose from "mongoose";
import { User, Expense } from "./custom_variables.js";
import { WhatsappResponse } from "./whatappapi.js";

dotenv.config({ path: ".env" });

const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;

async function thank_users() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Mongo Connected");

  const now = Date.now();
  const users = await User.find({});

  let sent = 0;
  for (const user of users) {
    const lastExpense = await Expense.findOne({ user_id: user.user_id }).sort({ date: -1 });
    if (!lastExpense) continue;

    const timeSinceLast = now - new Date(lastExpense.date).getTime();
    if (timeSinceLast < TEN_DAYS) {
      await WhatsappResponse(
        user.phone_number,
        `Hey! 🙏 Thank you for using ReSave and trusting us with your expenses — your support means a lot! We just shipped two new things: Expense Reminders (we'll nudge you if you forget to log) and Manual Addition (for when your AI limit is exhausted, just type: spent 200 on food and we'll log it instantly). Small entries today = big insights tomorrow. Keep tracking! 💸`
      );
      console.log(`Sent to ${user.phone_number}`);
      sent++;
    }
  }

  console.log(`Done. Thanked ${sent} user(s).`);
  await mongoose.disconnect();
}

thank_users();
