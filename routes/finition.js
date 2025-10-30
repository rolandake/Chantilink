// routes/finition.js
import express from "express";
import FinitionCalc from "../models/FinitionCalc.js";
import authMiddleware from "../middlewares/auth.js";

const router = express.Router();

// POST /api/finition — sauvegarder un calcul finition
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { data, coefPerte, devise } = req.body;
    const userId = req.user.id;

    if (!data) return res.status(400).json({ message: "Données manquantes" });

    const calc = new FinitionCalc({ userId, data, coefPerte, devise });
    await calc.save();

    res.status(201).json({ message: "Calcul finition sauvegardé", calc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /api/finition — récupérer l'historique des calculs finition
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const calculs = await FinitionCalc.find({ userId }).sort({ createdAt: -1 });
    res.json(calculs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


export default router;
