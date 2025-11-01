// backend/routes/uploadMessages.js
import express from "express";
import multer from "multer";
import { uploadFile } from "../utils/cloudinaryServer.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// --- Multer en mémoire ---
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|webm|mp3|wav|ogg|pdf/;
    if (allowed.test(file.mimetype) || allowed.test(file.originalname.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Type de fichier non autorisé"), false);
    }
  },
});

// --- Upload sur Cloudinary ---
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier" });

    const folder = "messages"; // dossier Cloudinary

    // Utilisation de ton utilitaire centralisé
    const result = await uploadFile(req.file.buffer, folder, req.file.originalname);

    res.json({
      success: true,
      fileUrl: result.secure_url,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      public_id: result.public_id,
    });
  } catch (err) {
    console.error("❌ Erreur upload Cloudinary:", err);
    res.status(500).json({ error: "Erreur serveur lors de l'upload" });
  }
});

export default router;
