// backend/routes/messageRoutes.js
import express from "express";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import { verifyToken } from "../middleware/auth.js";
import { io } from "../server.js"; // instance Socket.IO
import multer from "multer";
import fs from "fs";
import { uploadFile } from "../utils/cloudinaryServer.js"; // import correct Cloudinary

const router = express.Router();

// ------------------------------
// Multer pour stockage temporaire
// ------------------------------
const upload = multer({ dest: "tmp/" });

// ======================================
// Envoyer un message (texte, fichier, audio, story)
// ======================================
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  const senderId = req.user.id;
  const { recipientId, content, storyId, replyTo } = req.body;
  let fileUrl = null;

  if (!recipientId) return res.status(400).json({ message: "Destinataire requis" });
  if (!mongoose.Types.ObjectId.isValid(recipientId))
    return res.status(400).json({ message: "ID utilisateur destinataire invalide" });

  try {
    // Upload sur Cloudinary si fichier/audio présent
    if (req.file) {
      const result = await uploadFile(req.file.path, "messages", req.file.originalname);
      fileUrl = result.secure_url;
      fs.unlinkSync(req.file.path); // Supprime le fichier temporaire
    }

    // Création du message
    const message = new Message({
      sender: senderId,
      recipient: recipientId,
      content: content || "",
      file: fileUrl,
      storyId: storyId || null,
      replyTo: replyTo || null,
      read: false,
    });

    await message.save();

    // Population pour frontend
    await message.populate("sender", "username fullName profilePhoto");
    await message.populate("recipient", "username fullName profilePhoto");

    // Émission Socket.IO
    io.to(recipientId).emit("receiveMessage", { message });
    io.to(senderId).emit("receiveMessage", { message });

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur lors de l'envoi du message" });
  }
});

// ======================================
// Récupérer la conversation entre deux utilisateurs
// ======================================
router.get("/conversation/:userId", verifyToken, async (req, res) => {
  const currentUserId = req.user.id;
  const otherUserId = req.params.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  if (!mongoose.Types.ObjectId.isValid(otherUserId))
    return res.status(400).json({ message: "ID utilisateur invalide" });

  try {
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId },
      ],
      deletedFor: { $ne: currentUserId },
    })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("sender", "username fullName profilePhoto")
      .populate("recipient", "username fullName profilePhoto")
      .populate("replyTo");

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des messages" });
  }
});

// ======================================
// Marquer les messages comme lus
// ======================================
router.put("/read/:senderId", verifyToken, async (req, res) => {
  const currentUserId = req.user.id;
  const senderId = req.params.senderId;

  if (!mongoose.Types.ObjectId.isValid(senderId))
    return res.status(400).json({ message: "ID utilisateur invalide" });

  try {
    await Message.updateMany(
      { sender: senderId, recipient: currentUserId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    res.json({ message: "Messages marqués comme lus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour des messages" });
  }
});

// ======================================
// Compter les messages non lus
// ======================================
router.get("/unread-count", verifyToken, async (req, res) => {
  const currentUserId = req.user.id;

  try {
    const counts = await Message.aggregate([
      { $match: { recipient: new mongoose.Types.ObjectId(currentUserId), read: false } },
      { $group: { _id: "$sender", count: { $sum: 1 } } },
    ]);

    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur lors du comptage des messages non lus" });
  }
});

export default router;
