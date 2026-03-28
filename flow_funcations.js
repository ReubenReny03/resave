import mongoose, { model, ObjectId } from "mongoose";
import { Dbconfig, Expense, User } from "./custom_variables.js";
import { spending_categories } from "./custom_variables.js";
import { WhatsappResponse } from "./whatappapi.js";
import { ADD_EXPENSE_SCHEMA, INSIGHT_SCHEMA } from "./tool_schema.js";
import { executeToolCall, add_expense } from "./tools.js";
import { get_customer_info } from "./mongo_db.js";
import { AIclient, MODEL, ONE_HOUR } from "./variables.js";

async function check_manual_message(text_msg, customerNumber) {
  const re = /spent (\d+(?:\.\d+)?) on (\w+)/gi;
  const myArray = [...text_msg.matchAll(re)];
  if (myArray.length > 0) {
    for (let x in myArray) {
      let amount = myArray[x][1];
      let category = myArray[x][2];
      const customer = await get_customer_info(customerNumber);
      await add_expense(
        { user_id: customer.user_id, todaysDate: new Date(), text_msg },
        { amount: parseFloat(amount), category, transaction: "Expense" }
      );
      WhatsappResponse(
        customerNumber,
        `Your Manual Expense of ₹${amount} added to category: ${category}`,
      );
    }
    return true;
  }
}

async function get_full_customer(customerNumber) {
  let customer = await get_customer_info(customerNumber);
  return customer;
}

async function check_time_limit(customer_info, customerNumber) {
  const now = Date.now();
  const count = customer_info.count;
  const last_used = customer_info.last_used;
  const user_id = customer_info.user_id;

  if (now - last_used < ONE_HOUR) {
    if (count > 4) {
      const remaining = Math.ceil((ONE_HOUR - (now - last_used)) / 60000);
      WhatsappResponse(
        customerNumber,
        `You hit the hourly AI limit. Please try again after ${remaining} minutes. u can add manualy useing spent x on y where x is the amount and y is the category`,
      );
      return true;
    } else {
      await User.updateOne(
        { user_id: user_id },
        { count: count + 1, last_used: now },
      );
      return false;
    }
  } else {
    await User.updateOne(
      { user_id: user_id },
      { count: 0, last_used: now },
    );
    return false;
  }
}

async function start_ai_process(customer_info, text_msg, customerNumber) {
  let meta_data = {
    user_id: customer_info.user_id,
    todaysDate: new Date(),
    text_msg: text_msg,
  };
  if (customer_info.status == "NEW_ID") {
    WhatsappResponse(
      customerNumber,
      `Your Customer ID is ${customer_info.user_id}. Your account has been successfully activated. You can now simply send any expense in this chat, and I'll automatically record it in your account.`,
    );
  } else {
    const messages = [
      {
        role: "system",
        content:
          "Do not give responses in MD format you are in a whataspp chat so dont use ** and also you need to have your final answer in one line only you are a accountant and you need to specify based on the given msg what is the Transaction , Amount and Category, Be very carfully the below msg should just be a msg from the user to his accountent to add money or ask about insigts nothing else. If user is saying anything else just rost them back and if its a expense add return a final msg saying the Amount x was added susscessfully undet the catagory of y write it in a good way, user will never give the catagory you need pick the catagory from the list and people might use local indian slags like auto as in the auto riksha for travel and other such things so be care full ok",
      },

      { role: "user", content: text_msg },
    ];

    const response = await AIclient.chat.completions.create({
      model: MODEL,
      messages: messages,
      tools: [ADD_EXPENSE_SCHEMA, INSIGHT_SCHEMA],
    });

    messages.push(response.choices[0].message);

    if (response.choices[0].message.tool_calls) {
      for (const toolCall of response.choices[0].message.tool_calls) {
        const functionResponse = await executeToolCall(meta_data, toolCall);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(functionResponse),
        });
      }

      const final = await AIclient.chat.completions.create({
        model: MODEL,
        messages: messages,
      });
      WhatsappResponse(customerNumber, final.choices[0].message.content);
      return true;
    } else {
      WhatsappResponse(customerNumber, response.choices[0].message.content);
      return true;
    }
  }
}

async function send_expense_reminders() {
  const now = Date.now();
  const TWENTY_HOURS = 20 * 60 * 60 * 1000;
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  try {
    const users = await User.find({});

    for (const user of users) {
      // skip if we already reminded this user in the last 24 hours
      if (now - (user.last_reminded || 0) < TWENTY_FOUR_HOURS) continue;

      // find their most recent expense
      const lastExpense = await Expense.findOne({ user_id: user.user_id }).sort({ date: -1 });

      const lastActivityTime = lastExpense ? new Date(lastExpense.date).getTime() : 0;
      const timeSinceLast = now - lastActivityTime;

      if (timeSinceLast > TWENTY_HOURS && timeSinceLast < TWENTY_FOUR_HOURS) {
        await WhatsappResponse(
          user.phone_number,
          `Hey! 👀 Looks like you haven't logged any expenses today. Don't let it slip — even a small entry goes a long way. Consistent tracking is what turns your daily spends into real insights. Just send me what you spent and I'll handle the rest! 💸`
        );
        await User.updateOne({ user_id: user.user_id }, { last_reminded: now });
      }
    }
  } catch (err) {
    console.log("Reminder job error:", err);
  }
}

export {
  check_manual_message,
  get_full_customer,
  check_time_limit,
  start_ai_process,
  send_expense_reminders,
};
