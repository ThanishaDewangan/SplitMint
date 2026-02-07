import Groq from "groq-sdk";

export function getGroqClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  return new Groq({ apiKey: key });
}

export const MINTENSE_MODEL = "llama-3.1-8b-instant";
