import express from "express";
import { OpenAI } from "openai";

const router = express.Router();

// Initialisation OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message manquant" });
    }

    // Préparer le prompt
    const messages = [
      {
        role: "system",
        content: "Tu es Assistant BTP IA, expert en bâtiment, construction, métrés, normes et calculs techniques. Réponds clairement et en français."
      },
      { role: "user", content: message },
    ];

    // Appel OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    const answer = completion?.choices?.[0]?.message?.content || "Je n'ai pas de réponse.";

    // Retourner directement la réponse
    res.json({ response: answer });

  } catch (err) {
    console.error("Erreur GPT:", err);
    res.status(500).json({ message: "Erreur serveur OpenAI" });
  }
});

export default router;
