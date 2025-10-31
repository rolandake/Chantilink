import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Route pour changer le mot de passe
router.post("/change-password", verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(400).json({ success: false, message: "Utilisateur introuvable" });
  }

  // Vérifier que l'ancien mot de passe est correct
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: "Ancien mot de passe incorrect" });
  }

  // Hasher le nouveau mot de passe
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;

  await user.save();
  return res.status(200).json({ success: true, message: "Mot de passe changé avec succès" });
});


export default router;
