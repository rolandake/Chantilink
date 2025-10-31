import Conversation from "../models/Conversation.js";
import ConversationComment from "../models/Conversation.js"; // même fichier, modèle ConversationComment
import mongoose from "mongoose";

// Créer une nouvelle conversation
export const createConversation = async (req, res) => {
  try {
    const { title, participants } = req.body;

    if (!title || !participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: "Titre et participants requis" });
    }

    const conversation = new Conversation({
      title,
      participants,
      createdAt: new Date(),
    });

    await conversation.save();
    res.status(201).json(conversation);
  } catch (err) {
    res.status(500).json({ error: "Erreur création conversation", details: err.message });
  }
};

// Récupérer une conversation par son ID, avec commentaires peuplés
export const getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate({
        path: "comments",
        populate: { path: "author", select: "username" },
      })
      .populate("participants", "username");

    if (!conversation) {
      return res.status(404).json({ error: "Conversation non trouvée" });
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération conversation", details: err.message });
  }
};

// Ajouter un commentaire à une conversation
export const addCommentToConversation = async (req, res) => {
  try {
    const { content } = req.body;
    const conversationId = req.params.id;
    const userId = req.user.id;

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Le contenu du commentaire est requis" });
    }

    // Créer le commentaire ConversationComment
    const comment = new ConversationComment({
      content: content.trim(),
      author: userId,
      createdAt: new Date(),
    });
    await comment.save();

    // Ajouter l'ID du commentaire dans la conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation non trouvée" });
    }

    conversation.comments.push(comment._id);
    await conversation.save();

    // Retourner la liste des commentaires peuplés
    const updatedConversation = await Conversation.findById(conversationId)
      .populate({
        path: "comments",
        populate: { path: "author", select: "username" },
      });

    res.status(201).json(updatedConversation.comments);
  } catch (err) {
    res.status(500).json({ error: "Erreur ajout commentaire", details: err.message });
  }
};

// Supprimer un commentaire d'une conversation (optionnel)
export const deleteCommentFromConversation = async (req, res) => {
  try {
    const { commentId, conversationId } = req.params;
    const userId = req.user.id;

    const comment = await ConversationComment.findById(commentId);
    if (!comment) return res.status(404).json({ error: "Commentaire non trouvé" });
    if (comment.author.toString() !== userId) return res.status(403).json({ error: "Action non autorisée" });

    // Supprimer commentaire
    await comment.deleteOne();

    // Retirer référence dans la conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      $pull: { comments: commentId },
    });

    res.json({ message: "Commentaire supprimé" });
  } catch (err) {
    res.status(500).json({ error: "Erreur suppression commentaire", details: err.message });
  }
};

// Lister toutes les conversations d’un utilisateur
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", "username")
      .sort({ updatedAt: -1 });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération conversations", details: err.message });
  }
};
