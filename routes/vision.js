// backend/routes/visionExpert.js
import express from "express";
import OpenAI from "openai";
import { SYSTEM_PROMPT, AI_CONFIG } from "../aiConfig.js"; // <-- import du rôle IA

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Endpoint IA Expert BTP
router.post("/expert", async (req, res) => {
  try {
    const { userMessage, projectContext } = req.body;

    const completion = await client.chat.completions.create({
      model: AI_CONFIG.model,          // utilise la config centralisée
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Contexte projet: ${projectContext || "N/A"}` },
        { role: "user", content: userMessage },
      ],
      temperature: AI_CONFIG.temperature
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error("Erreur Expert IA:", error);
    res.status(500).json({ error: "Erreur IA expert" });
  }
});

export default router;
