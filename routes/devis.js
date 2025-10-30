// backend/routes/devis.js
import express from "express";
import mongoose from "mongoose";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Schéma Mongoose pour les devis
const devisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  quantites: {
    ciment: Number,
    sable: Number,
    gravier: Number,
    eau: Number,
  },
  prixUnitaires: {
    ciment: Number,
    sable: Number,
    gravier: Number,
    eau: Number,
  },
  coutsMateriaux: {
    ciment: Number,
    sable: Number,
    gravier: Number,
    eau: Number,
  },
  mainOeuvre: {
    ouvriers: Number,
    coutParOuvrier: Number,
    dureeHeures: Number,
  },
  totalMateriaux: Number,
  totalMainOeuvre: Number,
  totalGlobal: Number,
  devise: { type: String, default: "FCFA" },
  createdAt: { type: Date, default: Date.now },
});

const Devis = mongoose.model("Devis", devisSchema);

// Route pour sauvegarder un devis
router.post("/save", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Utilisateur non authentifié" });

    const {
      quantites,
      prixUnitaires,
      coutsMateriaux,
      mainOeuvre,
      totalMateriaux,
      totalMainOeuvre,
      totalGlobal,
      devise,
    } = req.body;

    const nouveauDevis = new Devis({
      userId,
      quantites,
      prixUnitaires,
      coutsMateriaux,
      mainOeuvre,
      totalMateriaux,
      totalMainOeuvre,
      totalGlobal,
      devise,
    });

    await nouveauDevis.save();

    res.status(201).json({ message: "✅ Devis sauvegardé avec succès", devis: nouveauDevis });
  } catch (err) {
    console.error("❌ Erreur sauvegarde devis:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


export default router;
