import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Storage pour messages
const messageStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads/messages");
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || "anonymous";
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${userId}-${timestamp}-${random}${ext}`);
  },
});

const upload = multer({
  storage: messageStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|webm|mp3|wav|ogg|pdf/;
    if (allowed.test(file.mimetype) || allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Type de fichier non autorisé"), false);
    }
  },
});

// Upload un fichier
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier" });
    }

    const fileUrl = `/uploads/messages/${req.file.filename}`;

    res.json({
      success: true,
      fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error("❌ Erreur upload message:", error);
    res.status(500).json({ error: "Erreur upload" });
  }
});

export default router;