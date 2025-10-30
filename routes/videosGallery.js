import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// --- Multer storage ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/videos";
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${timestamp}${ext}`);
  }
});

// --- Filtrer uniquement les vidéos ---
const fileFilter = (req, file, cb) => {
  const allowedTypes = /mp4|mov|webm|ogg/;
  allowedTypes.test(file.mimetype) ? cb(null, true) : cb(new Error("Seuls les formats MP4/MOV/WEBM/OGG sont autorisés"));
};

const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 }, fileFilter }); // 200MB max

// --- Upload vidéo ---
router.post("/upload", verifyToken, upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Aucune vidéo reçue" });

  const newVideo = {
    filename: req.file.filename,
    url: `/uploads/videos/${req.file.filename}`,
    uploader: req.user.id,
    type: req.body.type || "autre",
    createdAt: new Date()
  };

  // Tu peux enregistrer dans MongoDB si besoin
  res.json({ message: "Vidéo uploadée", video: newVideo });
});

// --- Lister toutes les vidéos ---
router.get("/", verifyToken, async (req, res) => {
  const dir = path.join("uploads", "videos");
  if (!fs.existsSync(dir)) return res.json([]);

  const files = fs.readdirSync(dir).map((file) => ({
    url: `/uploads/videos/${file}`,
    filename: file
  }));

  res.json(files);
});

export default router;
