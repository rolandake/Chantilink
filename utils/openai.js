// utils/openai.js
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Assure-toi que ta clé est dans .env
});

export async function getChatCompletion(messages) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  });
  return response.choices[0].message.content;
}
