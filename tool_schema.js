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
export const ADD_EXPENSE_SCHEMA = {
  "type": "function",
  "function": {
    "name": "add_expense",
    "description": "to add an expense or income into an account",
    "parameters": {
      "type": "object",
      "properties": {
            "amount": {
                "type": "integer",
                "description": "The amount to be added into the account"
            },
            "transaction": {
                "type": "string",
                "description": "You can set it to Expense or Income based on the users msg."
            },
            "category": {
                "type": "string",
                "description": `You can select any one catagory you want it to be i'll suggest ${spending_categories} from these catagories u can take.`
            }
      }
    }
  }
}
export const INSIGHT_SCHEMA = {
  type: "function",
  function: {
    name: "get_insight",
    description: `
Generate a MongoDB aggregation pipeline to analyze a user's expenses.

Collection name: Expenses

Fields available:

user_id (String)
- Unique id of the user
- Do NOT include this in the pipeline. It is automatically added.

transaction (String)
- Type of transaction
- Possible values: "Expense", "Income"

amount (Number)
- Money value of the transaction
- Used for calculations like sum, avg, max, min

date (ISODate)
- Date when the transaction was recorded
- Used for sorting or filtering by time

category (String)
- Category of the expense
- Example values: Food, Transportation, Rent, Shopping, Entertainment

desp (String)
- Description entered by the user
- Example: "48.5 for AC train"

Rules:
- Only generate valid MongoDB aggregation stages
- Do NOT include user_id filters
- Allowed stages: $match, $group, $sort, $limit, $project, $count
`,

    parameters: {
      type: "object",
      properties: {
        pipeline: {
          type: "array",
          description:
            "MongoDB aggregation pipeline stages used to calculate the requested insight.",
          items: {
            type: "object"
          }
        },

        message: {
          type: "string",
          description:
            "A human readable explanation of what insight is being calculated."
        }
      },

      required: ["pipeline"]
    }
  }
}