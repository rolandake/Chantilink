// backend/routes/openaiService.js
import OpenAI from "openai";
import { AI_CONFIG, SYSTEM_PROMPT } from "../aiConfig.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function askGPT(prompt) {
  const completion = await client.chat.completions.create({
    model: AI_CONFIG.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    temperature: AI_CONFIG.temperature
  });

  return completion.choices[0].message.content;
}
