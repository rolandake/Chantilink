// backend/routes/chatRoutes.js
import express from "express";
import fs from "fs";
import pdfjs from "pdfjs-dist";
import Tesseract from "tesseract.js";
import { handleLocalProjectAdvanced } from "../utils/localAIHandlerAdvanced.js";
import LocalChat from "../models/LocalChat.js";
import OpenAI from "openai";

const router = express.Router();
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * POST /api/chat/process
 * Reçoit un message utilisateur + plan éventuel
 * Renvoie la réponse IA, questions, estimation, étapes
 */
router.post("/process", async (req, res) => {
  const { userId, projectParams = {}, messages = [], planFile } = req.body;
  if (!userId || !messages.length) return res.status(400).json({ error: "userId ou messages manquants" });

  let extractedData = null;
  let values = projectParams?.values || {};
  const lastMessage = messages[messages.length - 1]?.content || "";

  // --- Extraction texte PDF / OCR image ---
  if (planFile) {
    try {
      const { buffer, mimetype } = planFile;
      let planText = "";

      if (mimetype === "application/pdf") {
        const pdf = await pdfjs.getDocument({ data: buffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          planText += content.items.map(item => item.str).join(" ") + " ";
        }
      } else if (mimetype.startsWith("image/")) {
        const { data: { text } } = await Tesseract.recognize(Buffer.from(buffer), "fra");
        planText = text;
      }

      // Ici tu peux ajouter ton analyse locale pour extraire murs, portes, fenêtres, etc.
      extractedData = { planText }; 
      // Par exemple : values = extractPlanElements(planText);

    } catch (err) {
      console.error("❌ Erreur extraction plan :", err);
    }
  }

  // --- Appel IA OpenAI (si disponible) ---
  let aiResult = null;
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "Tu es un assistant expert BTP et analyse de plans." },
          ...messages
        ],
        temperature: 0.3
      });
      aiResult = { response: completion.choices[0].message.content };
    } catch (err) {
      console.warn("⚠️ OpenAI indisponible, fallback IA locale :", err.message);
    }
  }

  // --- Fallback IA locale avancée ---
  if (!aiResult) {
    aiResult = await handleLocalProjectAdvanced({
      sessionId: userId,
      planText: extractedData?.planText || "",
      values,
      userMessage: lastMessage
    });
  }

  // --- Sauvegarde historique MongoDB ---
  try {
    await LocalChat.updateOne(
      { userId },
      { $push: { messages: [
        { role: "user", content: lastMessage },
        { role: "ai", content: aiResult.response }
      ] } },
      { upsert: true }
    );
  } catch (err) {
    console.error("Erreur sauvegarde historique :", err);
  }

  res.json({
    reply: aiResult.response,
    steps: aiResult.steps || [],
    estimation: aiResult.estimation || {},
    questions: aiResult.questions || [],
    extractedPlan: extractedData || null
  });
});

export default router;
