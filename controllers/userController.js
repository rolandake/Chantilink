// backend/controllers/userController.js
import User from "../models/User.js";
import mongoose from "mongoose";
import pino from "pino";

// --- LOGGER Pino ---
const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM:ss" },
  },
});

// --------------------------
// MISE À JOUR DU PROFIL UTILISATEUR
// --------------------------
export const updateUserController = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: "Utilisateur non authentifié" });
    }

    if (currentUserId !== id) {
      return res.status(403).json({ success: false, message: "Vous ne pouvez modifier que votre propre profil" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "ID utilisateur invalide" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable" });

    const allowedFields = [
      "fullName",
      "bio",
      "location",
      "website",
      "profilePhoto",
      "coverPhoto",
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) updateData[field] = updates[field].trim?.() ?? updates[field];
    });

    // Interdire la modification de l'email via cette route
    if (updates.email && updates.email !== user.email) {
      return res.status(400).json({ success: false, message: "Modification de l'email non autorisée via cette route" });
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "Aucune modification à effectuer" });
    }

    const updatedUser = await User.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
      .select("-password")
      .populate("followers", "fullName profilePhoto")
      .populate("following", "fullName profilePhoto")
      .lean();

    logger.info(`✅ Profil mis à jour: ${user.email}`);
    res.status(200).json({ success: true, message: "Profil mis à jour avec succès", user: updatedUser });

  } catch (err) {
    logger.error("❌ updateUserController error:", err);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la mise à jour",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// --------------------------
// RÉCUPÉRER UN UTILISATEUR PAR ID
// --------------------------
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "ID utilisateur invalide" });
    }

    const user = await User.findById(id)
      .select("-password")
      .populate("followers", "fullName profilePhoto")
      .populate("following", "fullName profilePhoto")
      .lean();

    if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable" });

    res.status(200).json({ success: true, user });
  } catch (err) {
    logger.error("❌ getUserById error:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// --------------------------
// RECHERCHE D'UTILISATEURS
// --------------------------
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Requête de recherche trop courte (≥2 caractères)" });
    }

    const users = await User.find({
      $or: [
        { fullName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    })
      .select("fullName email profilePhoto bio")
      .limit(20)
      .lean();

    logger.info(`🔍 Recherche utilisateurs: "${q}" (${users.length} résultats)`);
    res.status(200).json({ success: true, users, count: users.length });
  } catch (err) {
    logger.error("❌ searchUsers error:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};