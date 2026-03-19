import { Expense } from "./custom_variables.js";

function add_expense(meta_data,response) {
    console.log(meta_data)
    console.log(response)
    // metadata --> user_id,todaysDate,text_msg
    // response --> Amount,Transaction,Category
    const newExpence = new Expense({user_id:meta_data.user_id,amount:response.amount,transaction:response.transaction,category:response.category,date:meta_data.todaysDate,desp:meta_data.text_msg})
    newExpence.save()

    return {rsponse:"Expense Added Successfully"}
}


async function get_insight(meta_data,data) {
  /**
   * Execute the calculation
   */
  try {

    const response = await Expense.aggregate([
  { $match: { user_id: meta_data.user_id } },
  ...data.pipeline

])

    console.log(response)
    return {response,"send_style":"you are sending a whatsapp msg so use that style so use 1 star or underscore not like MD"}
  } catch (e) {
    return `Error: ${e.message}`;
  }
}


// Map function names to implementations
const availableFunctions = {
  add_expense: add_expense,
  get_insight: get_insight
  // Add more tools here as you build them
  // get_weather: getWeather,
  // search_database: searchDatabase,
};

function executeToolCall(meta_data,toolCall) {
  /**
   * Parse and execute a single tool call
   */
  const functionName = toolCall.function.name;
  const functionToCall = availableFunctions[functionName];
  const functionArgs = JSON.parse(toolCall.function.arguments);



  // Call the function with unpacked arguments
  return functionToCall(meta_data,functionArgs);
}

export { add_expense, availableFunctions, executeToolCall };

