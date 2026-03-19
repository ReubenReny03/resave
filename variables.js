import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config({ path: '.env' })

const AIclient = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "openai/gpt-oss-120b";
const ONE_HOUR = 60 * 60 * 1000;

export { AIclient, MODEL, ONE_HOUR }
