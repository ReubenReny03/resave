# ReSave — WhatsApp AI Expense Tracker

Track your expenses by just sending a WhatsApp message. ReSave uses AI to understand natural language, categorize your spending automatically, and give you financial insights — all inside WhatsApp.

---

## How It Works

1. You send a WhatsApp message like `"spent 250 on lunch"` or `"paid 1200 for auto"`
2. ReSave's AI parses the message, picks the right category, and logs the expense
3. Ask for insights like `"how much did I spend this week?"` and get a reply instantly

No app to install. No forms to fill. Just chat.

---

## Features

- **Natural language expense logging** — just describe what you spent
- **Auto-categorization** — AI picks from 20 spending categories (Food, Travel, Rent, etc.)
- **Indian slang support** — understands terms like "auto" (rickshaw), local food names, etc.
- **Financial insights** — ask questions about your spending and get real-time answers via MongoDB aggregation
- **Manual entry shortcut** — use `spent X on Y` format to bypass AI for quick adds
- **Rate limiting** — max 4 AI calls per hour per user to prevent abuse
- **Multi-model support** — works with OpenAI, Groq, or Google Gemini

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ES Modules) |
| API Server | Express.js |
| Database | MongoDB + Mongoose |
| AI | Groq / OpenAI / Google Gemini |
| WhatsApp | MSG91 WhatsApp API |
| Notifications | Telegram Bot API |

---

## Project Structure

```
resave/
├── main.js                # Express server + webhook entry point
├── flow_funcations.js     # Core business logic & AI orchestration
├── tools.js               # Tool execution (add_expense, get_insight)
├── tool_schema.js         # AI function/tool schemas
├── custom_variables.js    # Mongoose models (User, Expense)
├── mongo_db.js            # Database helper functions
├── whatappapi.js          # MSG91 WhatsApp API wrapper
├── ai_functions.js        # AI client setup
├── variables.js           # Shared config & env exports
├── .env.example           # Environment variable template
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance
- MSG91 account with WhatsApp API access
- API key from at least one AI provider (Groq, OpenAI, or Gemini)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/resave.git
cd resave
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
PORT="3000"
MONGO_URI="mongodb://user:password@host:27017/dbname"
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
OPENAI_API_KEY="sk-..."
MODEL="OPENAI"
openai_model="gpt-4o-mini"
GEMINI_API_KEY="your_gemini_api_key"
GROQ_API_KEY="gsk_..."
MSG91_TOKEN="your_msg91_token"
WHATSAPP_INTEGRATED_NUMBER="91XXXXXXXXXX"
```

### 4. Run the server

```bash
npm start
```

The server starts at `http://localhost:3000`.

### 5. Set up the webhook

Point your MSG91 WhatsApp webhook to:

```
POST http://your-server.com/webhook/get_expence
```

Expected payload:
```json
{
  "customerNumber": "919XXXXXXXXX",
  "text": "spent 500 on groceries"
}
```

---

## Expense Categories

ReSave auto-assigns one of these categories:

`Food & Dining` · `Groceries` · `Transportation` · `Fuel` · `Rent` · `Utilities` · `Internet & Mobile` · `Shopping` · `Entertainment` · `Subscriptions` · `Health & Medical` · `Insurance` · `Education` · `Travel` · `Personal Care` · `Gifts & Donations` · `EMI & Loans` · `Investments` · `Home Maintenance` · `Miscellaneous`

---

## Manual Entry Format

To skip AI processing and log directly:

```
spent 200 on food
```

Pattern: `spent {amount} on {category}`

---

## Rate Limiting

Each user is limited to **4 AI calls per hour**. After the limit is hit, users receive a message with the remaining cooldown time. Manual entry (`spent X on Y`) is never rate-limited.

---

## License

ISC
