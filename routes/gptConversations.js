import express from "express";
import Conversation from "../models/Conversation.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// 🔹 GET - Liste des conversations
router.get("/", verifyToken, async (req, res) => {
  try {
    const convos = await Conversation.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .select("_id createdAt updatedAt");
    res.json({ conversations: convos });
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération conversations" });
  }
});

// 🔹 GET - Conversation complète par ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const convo = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!convo) return res.status(404).json({ error: "Conversation non trouvée" });
    res.json({ conversation: convo });
  } catch {
    res.status(500).json({ error: "Erreur récupération conversation" });
  }
});

// 🔹 POST - Envoyer un message (et recevoir réponse GPT)
router.post("/:id?", verifyToken, async (req, res) => {
  const { content } = req.body;
  const convoId = req.params.id;

  if (!content) return res.status(400).json({ error: "Message vide" });

  try {
    let conversation;

    if (convoId) {
      conversation = await Conversation.findOne({ _id: convoId, userId: req.userId });
      if (!conversation) return res.status(404).json({ error: "Conversation non trouvée" });
    } else {
      conversation = new Conversation({ userId: req.userId, messages: [] });
    }

    const userMsg = { role: "user", content };
    conversation.messages.push(userMsg);

    // ✅ Appel à OpenAI
    const assistantMsg = await getChatCompletion([...conversation.messages]);
    conversation.messages.push({ role: "assistant", content: assistantMsg });

    await conversation.save();

    res.json({
      message: assistantMsg,
      conversationId: conversation._id,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur traitement message GPT" });
  }
});

// 🔹 DELETE - Supprimer une conversation
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    await Conversation.deleteOne({ _id: req.params.id, userId: req.userId });
    res.json({ message: "Conversation supprimée" });
  } catch {
    res.status(500).json({ error: "Erreur suppression" });
  }
});


export default router;
