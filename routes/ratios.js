// routes/ratios.js
import express from "express";
import Ratio from "../models/Ratio.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Liste tous les ratios (utilisateur + ratios publics)
router.get("/", verifyToken, async (req, res) => {
  const userId = req.userId;
  const ratiosPublics = await Ratio.find({ userId: null });
  const ratiosPersos = await Ratio.find({ userId });
  res.json([...ratiosPublics, ...ratiosPersos]);
});

// Ajouter un ratio perso
router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const newRatio = new Ratio({ ...req.body, userId });
    await newRatio.save();
    res.status(201).json(newRatio);
  } catch (e) {
    res.status(500).json({ message: "Erreur création ratio" });
  }
});

// Modifier ratio perso
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const ratio = await Ratio.findOne({ _id: req.params.id, userId });
    if (!ratio) return res.status(404).json({ message: "Ratio non trouvé" });
    Object.assign(ratio, req.body);
    await ratio.save();
    res.json(ratio);
  } catch (e) {
    res.status(500).json({ message: "Erreur modification ratio" });
  }
});

// Supprimer ratio perso
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const ratio = await Ratio.findOneAndDelete({ _id: req.params.id, userId });
    if (!ratio) return res.status(404).json({ message: "Ratio non trouvé" });
    res.json({ message: "Ratio supprimé" });
  } catch (e) {
    res.status(500).json({ message: "Erreur suppression ratio" });
  }
});


export default router;
