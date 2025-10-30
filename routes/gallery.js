import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// --- Multer storage ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/gallery";
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${timestamp}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  allowedTypes.test(file.mimetype) ? cb(null, true) : cb(new Error("Seuls JPEG/JPG/PNG/GIF/WebP sont autorisés"));
};

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });

// --- Upload image ---
router.post("/upload", verifyToken, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Aucun fichier reçu" });

  const newImage = {
    filename: req.file.filename,
    url: `/uploads/gallery/${req.file.filename}`,
    uploader: req.user.id,
    type: req.body.type || "autre", // type fourni ou par défaut
    createdAt: new Date()
  };

  // Ici tu peux sauvegarder dans MongoDB si tu veux garder l'historique
  // ex: GalleryModel.create(newImage)

  res.json({ message: "Image uploadée", image: newImage });
});

// --- Lister toutes les images ---
router.get("/", verifyToken, async (req, res) => {
  const dir = path.join("uploads", "gallery");
  if (!fs.existsSync(dir)) return res.json([]);

  const files = fs.readdirSync(dir).map((file) => ({
    url: `/uploads/gallery/${file}`,
    filename: file
  }));

  res.json(files);
});

export default router;
