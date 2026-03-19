import mongoose, { model, ObjectId } from "mongoose";
import { Dbconfig, Expense, User } from "./custom_variables.js";
import { spending_categories } from "./custom_variables.js";
import { WhatsappResponse } from "./whatappapi.js";
import { ADD_EXPENSE_SCHEMA, INSIGHT_SCHEMA } from "./tool_schema.js";
import { executeToolCall } from "./tools.js";


function check_manual_message(text_msg, customerNumber) {
  const re = /spent \d+ on \w+/g;
  const now = Date.now();
  const myArray = [...text_msg.matchAll(re)];
  if (myArray.length > 0) {
    for (let x in myArray) {
      let amount = myArray[x][1];
      let category = myArray[x][2];
      WhatsappResponse(
        customerNumber,
        `Your Manual Expense of ₹${amount} added to category: ${category}`,
      );
    }
    return true;
  }
}

async function get_full_customer() {
  let customer = await get_customer_info(req.body.customerNumber);
  // let user_id = customer["val1"]
  // let status = customer["val2"]
  // let last_used = customer["last_used"] || 0;
  // let count = customer["count"] || 0;
  return customer;
}

async function check_time_limit(customer_info) {
  if (now - customer_info.last_used < ONE_HOUR) {
    if (count > 4) {
      const remaining = Math.ceil((ONE_HOUR - (now - last_used)) / 60000);

      WhatsappResponse(
        customerNumber,
        `You hit the hourly AI limit. Please try again after ${remaining} minutes. u can add manualy useing spent x on y where x is the amount and y is the category`,
      );
      return true;
    } else {
      count += 1;
      let a = await User.updateOne(
        { user_id: user_id },
        { count: count, last_used: now },
      );
      return false;
    }
  } else {
    count = 0; // reset after 1 hour
    let a = await User.updateOne(
      { user_id: user_id },
      { count: count, last_used: now },
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
      `Your Customer ID is ${user_id}. Your account has been successfully activated. You can now simply send any expense in this chat, and I’ll automatically record it in your account.`,
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

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: messages,
      tools: [ADD_EXPENSE_SCHEMA, INSIGHT_SCHEMA], // Your schema from step 1
    });

    messages.push(response.choices[0].message);

    if (response.choices[0].message.tool_calls) {
      // 3. Execute each tool call (using the helper function from step 2)
      for (const toolCall of response.choices[0].message.tool_calls) {
        const functionResponse = await executeToolCall(meta_data, toolCall);

        // Add tool result to messages
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(functionResponse),
        });
      }

      // 4. Send results back and get final response
      const final = await client.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: messages,
      });
      WhatsappResponse(customerNumber, final.choices[0].message.content);
      return true
    } else {
      WhatsappResponse(customerNumber, response.choices[0].message.content);
      return true
    }
  }
}



export {check_manual_message, get_full_customer,check_time_limit,start_ai_process}