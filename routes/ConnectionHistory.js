import express from "express";
import { verifyToken } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

// Route pour récupérer l'historique des connexions
router.get("/connections", verifyToken, async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(400).json({ success: false, message: "Utilisateur introuvable" });
  }

  return res.json({ connections: user.connectionHistory });
});


export default router;
