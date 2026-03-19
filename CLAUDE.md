# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Start the Express server (node main.js)
npx nodemon main.js  # Start with auto-reload for development
```

No tests or linter are configured.

## Environment Setup

Copy `.env.example` to `.env` and fill in:
- `MONGO_URI` — MongoDB connection string
- `MODEL` — AI provider: `OPENAI`, `GROQ`, or `GEMINI`
- `openai_model` / `GROQ_API_KEY` / `GEMINI_API_KEY` — provider-specific keys
- `MSG91_TOKEN` + `WHATSAPP_INTEGRATED_NUMBER` — WhatsApp delivery via MSG91
- `PORT` — defaults to 3000

## Architecture

ReSave is a WhatsApp expense tracker chatbot. Users send natural-language messages; the bot uses an AI model to categorize and persist expenses in MongoDB, then replies via WhatsApp.

**Webhook entry point:** `POST /webhook/get_expence` (main.js)

### Request flow

```
WhatsApp user → MSG91 webhook → main.js
  → check_manual_message()      # regex: /spent \d+ on \w+/i — skip AI if matched
  → get_full_customer()         # find/create User doc in MongoDB
  → check_time_limit()          # max 4 AI calls per user per hour
  → start_ai_process()          # call AI with tool-calling schema
      → executeToolCall()       # add_expense | get_insight
  → WhatsappResponse()          # send reply via MSG91
```

### Key files

| File | Responsibility |
|------|---------------|
| `main.js` | Express server, webhook handler |
| `flow_funcations.js` | Full orchestration: manual check → rate limit → AI → tools → reply |
| `tools.js` | Tool implementations: `add_expense` (insert Expense doc), `get_insight` (MongoDB aggregation) |
| `tool_schema.js` | Zod schemas defining the AI function-calling interface |
| `custom_variables.js` | Mongoose models: `User`, `Expense`, `Dbconfig`; spending categories enum |
| `mongo_db.js` | `get_customer_info()` — upsert user, generate 8-digit user ID via `Dbconfig` counter |
| `ai_functions.js` | AI client initialisation (Groq currently wired in) |
| `whatappapi.js` | MSG91 WhatsApp send wrapper |
| `variables.js` | Shared exports: `PORT`, `ONE_HOUR`, `MODEL`, `AIclient` |

### Data models (custom_variables.js)

- **Expense** — `user_id`, `transaction` (Expense/Income), `amount`, `date`, `category`, `desp`
- **User** — `user_id`, `phone_number`, `state`, `last_used`, `count` (rate-limit counter)
- **Dbconfig** — `user_count` global counter used to generate unique user IDs

### AI tool-calling

Two tools are exposed to the AI (schemas in `tool_schema.js`, implementations in `tools.js`):

- **`add_expense`** — records a single transaction; requires `amount`, `category` (one of 21 fixed categories), `transaction` type, and optional `description`/`date`
- **`get_insight`** — runs a MongoDB aggregation to answer spending questions; accepts a flexible filter/group spec

The AI provider is swappable (`MODEL` env var); OpenAI, Groq, and Gemini are all supported.
