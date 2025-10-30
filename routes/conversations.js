import express from "express";
import { verifyToken } from "../middleware/auth.js";
import Conversation from "../models/Conversation.js";

const router = express.Router();

// Liste des conversations où participe l'utilisateur (résumé)
router.get("/", verifyToken, async (req, res) => {
  try {
    // On filtre sur les conversations où l'utilisateur est participant
    const convs = await Conversation.find({ participants: req.user.id })
      .sort({ updatedAt: -1 })
      .select("_id title createdAt updatedAt participants comments")
      .populate("participants", "username");

    // Pour chaque conversation on peut renvoyer un résumé avec le dernier message par exemple
    // Si tu stockes messages dans un champ, adapte ici pour renvoyer ce dont tu as besoin
    res.json(convs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Détail d’une conversation, vérifie que l'utilisateur est participant
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const conv = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user.id,
    })
      .populate("participants", "username")
      .populate({
        path: "comments",
        populate: { path: "author", select: "username" },
      });

    if (!conv) return res.status(404).json({ message: "Conversation non trouvée" });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Supprimer une conversation (uniquement si utilisateur est participant)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    // On vérifie que l’utilisateur est participant pour autoriser suppression
    const conv = await Conversation.findOneAndDelete({
      _id: req.params.id,
      participants: req.user.id,
    });
    if (!conv) return res.status(404).json({ message: "Conversation non trouvée" });
    res.json({ message: "Conversation supprimée" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
