import express from "express";
import { verifyToken } from "../middleware/auth.js";
import GptMessage from "../models/GptMessage.js";

const router = express.Router();

// GET /api/gptMessages/conversation
// Récupère tout l'historique GPT de l'utilisateur connecté, trié chronologiquement
router.get("/conversation", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await GptMessage.find({ user: userId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error("Erreur récupération historique GPT :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
