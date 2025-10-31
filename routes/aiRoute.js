import express from "express";
import multer from "multer";
import { handleLocalProject } from "../utils/localAIHandler.js";
import LocalChat from "../models/LocalChat.js";

const router = express.Router();

// Multer pour upload de plans
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// -----------------------------
// 1️⃣ Analyse de plans (Vision IA) locale
// -----------------------------
router.post("/ai/vision/analyze", upload.single("plan"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });

  try {
    // Pour l'instant on simule un résumé local
    const planText = `Plan chargé: ${req.file.path}`;
    const result = await handleLocalProject({
      history: [{ role: "user", content: planText }],
      planSummary: req.file.originalname,
      projectType: "generic",
      values: {}
    });

    res.json({ analysis: result.response, questions: result.questions });
  } catch (err) {
    console.error("Erreur analyse plan locale :", err);
    res.status(500).json({ error: "Impossible d'analyser le plan localement" });
  }
});

// -----------------------------
// 2️⃣ IA Expert BTP locale
// -----------------------------
router.post("/ai/vision/expert", async (req, res) => {
  try {
    const { userMessage, projectType, plans, values, userId } = req.body;
    if (!userMessage || !userId) return res.status(400).json({ error: "Message ou userId manquant" });

    const result = await handleLocalProject({
      history: [{ role: "user", content: userMessage }],
      planSummary: plans?.[0]?.name || "",
      projectType,
      values
    });

    // Stockage dans MongoDB
    await LocalChat.updateOne(
      { userId },
      { $push: { messages: { role: "user", content: userMessage } } },
      { upsert: true }
    );
    await LocalChat.updateOne(
      { userId },
      { $push: { messages: { role: "ai", content: result.response } } },
      { upsert: true }
    );

    res.json({ reply: result.response, questions: result.questions });
  } catch (error) {
    console.error("Erreur Expert IA locale :", error);
    res.status(500).json({ error: "Erreur IA expert locale" });
  }
});

// -----------------------------
// 3️⃣ Chat général IA locale
// -----------------------------
router.post("/ai/send", async (req, res) => {
  try {
    const { userMessage, userId } = req.body;
    if (!userMessage || !userId) return res.status(400).json({ error: "Message ou userId manquant" });

    const result = await handleLocalProject({
      history: [{ role: "user", content: userMessage }],
      projectType: "generic",
      values: {}
    });

    // Stockage dans MongoDB
    await LocalChat.updateOne(
      { userId },
      { $push: { messages: { role: "user", content: userMessage } } },
      { upsert: true }
    );
    await LocalChat.updateOne(
      { userId },
      { $push: { messages: { role: "ai", content: result.response } } },
      { upsert: true }
    );

    res.json({ reply: result.response, questions: result.questions });
  } catch (error) {
    console.error("Erreur Chat IA locale :", error);
    res.status(500).json({ error: "Impossible de générer une réponse locale" });
  }
});

export default router;
