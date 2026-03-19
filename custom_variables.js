import { z } from "zod";
import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  transaction: { type: String, required: true },
  amount: {type:Number, required:true},
  date: {type:Date, required: true},
  category: {type:String, required:true},
  desp: {type:String, required:true}
});

export const Expense = mongoose.model("Expense", expenseSchema);


const UserSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  phone_number: { type: String, required: true },
  state: { type: Number, required: true },
  last_used: { type: Number, required: true },
  count: { type: Number, required: true },
});

export const User = mongoose.model("users", UserSchema);


const dbconfig = new mongoose.Schema({
  user_count: { type: Number, required: true }
});

export const Dbconfig = mongoose.model("dbconfigs", dbconfig);


export const spending_categories = [
    "Food & Dining",
    "Groceries",
    "Transportation",
    "Fuel",
    "Rent",
    "Utilities",
    "Internet & Mobile",
    "Shopping",
    "Entertainment",
    "Subscriptions",
    "Health & Medical",
    "Insurance",
    "Education",
    "Travel",
    "Personal Care",
    "Gifts & Donations",
    "EMI & Loans",
    "Investments",
    "Home Maintenance",
    "Salary",
    "Miscellaneous"
]


export const expenseSchemaAI = z.object({
  Transaction: z.string().describe("this can be only [Expense,Income] so if i spend money which will be most of the time it will be Expense if the person is saying they got money then Income."),
  Amount: z.int().describe("this is simple its just the amount u need to save the amount mostly user will send it in INR if they specify any other corrency convert it to INR and send the response."),
  Category: z.string().describe(`keep simple category name we currently have ${spending_categories} if you need something else u can add it and send one more value as "new_category":"xyz"`),
  issue: z.string().describe("keep false if no issues if there is a issue make it true"),
  msg: z.string().describe("keep empty if no issue if issue is there then give the reason of that."),
});