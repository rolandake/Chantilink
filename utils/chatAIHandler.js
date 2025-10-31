import { handleLocalProject } from "./localAIHandler.js";
import { analyzeTextLocally } from "../routes/localVisionOCRRoutes.js";
import LocalChat from "../models/LocalChat.js";
import OpenAI from "openai";
import pdfParse from "pdf-parse";
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
        const data = await pdfParse(buffer);
        planText = data.text;
      } else if (mimetype.startsWith("image/")) {
        const { data: { text } } = await Tesseract.recognize(buffer, "fra");
        planText = text;
      }

      // Analyse locale du texte pour extraire les étapes
      extractedData = analyzeTextLocally(planText);

      // Remplissage dynamique des valeurs selon le type de projet
      values = { ...values, ...extractedData?.etapes };
    } catch (err) {
      console.error("❌ Erreur extraction plan :", err);
    }
  }

  // --- Fonction IA principale : OpenAI → fallback local ---
  const getAIResponse = async () => {
    let openAIResp = null;

    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: `Tu es un assistant expert multi-projets et analyse de plans.` },
            ...messages
          ],
          temperature: 0.3
        });

        openAIResp = completion.choices[0].message.content;
      } catch (err) {
        console.warn("⚠️ OpenAI indisponible → fallback local :", err.message);
      }
    }

    return handleLocalProject({
      history: messages,
      planSummary: projectParams?.planName || "",
      projectType: projectParams?.type || "generic",
      values,
      openAIResp
    });
  };

  const aiResult = await getAIResponse();

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
    extractedPlan: extractedData
  };
}
