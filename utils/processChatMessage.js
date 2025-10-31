// backend/utils/processChatMessage.js
import { handleLocalProjectAdvanced } from "./localAIHandlerAdvanced.js";
import { analyzeTextLocally } from "../routes/localVisionOCRRoutes.js";
import LocalChat from "../models/LocalChat.js";
import OpenAI from "openai";
import pdfjs from "pdfjs-dist";
import Tesseract from "tesseract.js";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function processChatMessage({ userId, projectParams, messages, planFile }) {
  if (!messages || !Array.isArray(messages) || !userId) {
    throw new Error("Messages ou userId manquant");
  }

  let extractedData = null;
  let values = projectParams?.values || {};
  const lastMessage = messages[messages.length - 1]?.content || "";

  // --- Extraction texte PDF / OCR image ---
  if (planFile) {
    const { buffer, mimetype } = planFile;
    let planText = "";

    try {
      if (mimetype === "application/pdf") {
        const pdf = await pdfjs.getDocument({ data: buffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          planText += content.items.map(item => item.str).join(" ") + " ";
        }
      } else if (mimetype.startsWith("image/")) {
        const { data: { text } } = await Tesseract.recognize(buffer, "fra");
        planText = text;
      }

      extractedData = analyzeTextLocally({ planText });
      values = {
        murs: extractedData.etapes.murs,
        poteaux: extractedData.etapes.poteaux,
        portes: extractedData.etapes.portes,
        fenetres: extractedData.etapes.fenetres,
        escaliers: extractedData.etapes.escaliers
      };
    } catch (err) {
      console.error("❌ Erreur extraction plan :", err);
    }
  }

  // --- IA principale : OpenAI → fallback local avancé ---
  const aiResult = await handleLocalProjectAdvanced({
    sessionId: userId,
    planText: planFile ? extractedData?.rawText || "" : "",
    values,
    userMessage: lastMessage
  });

  // --- Stockage historique MongoDB ---
  await LocalChat.updateOne(
    { userId },
    { $push: { messages: [
        { role: "user", content: lastMessage },
        { role: "ai", content: aiResult.response }
      ] } },
    { upsert: true }
  );

  return {
    reply: aiResult.response,
    steps: aiResult.steps || [],
    estimation: aiResult.estimation || {},
    questions: aiResult.questions || [],
    extractedPlan: extractedData,
    history: aiResult.history,
    planSummary: aiResult.planSummary,
    keyElements: aiResult.keyElements
  };
}
