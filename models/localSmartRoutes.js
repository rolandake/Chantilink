import express from "express";
import LocalChat from "../models/LocalChat.js";
import localAI from "../utils/localAI.js";
import { generateProjectAdvice } from "../utils/localAIAdvanced.js";

const router = express.Router();

router.post("/chat", async (req, res) => {
  try {
    const { userId, message, planSummary, values } = req.body;
    if (!userId || !message || !planSummary) {
      return res.status(400).json({ error: "userId, message et planSummary sont requis." });
    }

    let chat = await LocalChat.findOne({ userId });
    if (!chat) chat = new LocalChat({ userId, messages: [] });

    chat.messages.push({ role: "user", content: message });

    // 1️⃣ Vérifier les règles locales avec calcul
    let response = localAI(message, values);

    // 2️⃣ Si aucune règle locale ne correspond, utiliser la réponse avancée
    if (!response) {
      response = generateProjectAdvice(chat.messages, planSummary);
    }

    chat.messages.push({ role: "ai", content: response });

    await chat.save();

    res.json({ response, history: chat.messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

export default router;
