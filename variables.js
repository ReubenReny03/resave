import Groq from "groq-sdk";





dotenv.config({ path: '.env' })

const port = process.env.PORT


const AIclient = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "openai/gpt-oss-120b";

const ONE_HOUR = 60 * 60 * 1000;

















export {AIclient,MODEL,port}