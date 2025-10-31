import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { verifyToken } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

// --- Dictionnaire des types d'images supportés ---
const IMAGE_TYPES = {
  profileImage: { folder: "profiles", field: "profilePhoto" },
  coverImage: { folder: "covers", field: "coverPhoto" },
  projectImage: { folder: "projects", field: "projectPhoto" },
  documentImage: { folder: "documents", field: "documentPhoto" },
};

// --- Multer storage ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const config = IMAGE_TYPES[file.fieldname];
    if (!config) return cb(new Error("Type d’image non reconnu"), null);

    const dir = path.join("uploads", config.folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  allowedTypes.test(file.mimetype) ? cb(null, true) : cb(new Error("Seuls JPEG/JPG/PNG sont autorisés"));
};

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter }); // limite augmentée à 5Mo

// --- Fonction générique ---
const uploadAndSave = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Aucun fichier reçu" });

  const config = IMAGE_TYPES[req.file.fieldname];
  if (!config) return res.status(400).json({ message: "Type d’image non reconnu" });

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    // Supprimer ancienne image
    const oldImage = user[config.field];
    if (oldImage) {
      const oldPath = path.join("uploads", oldImage.replace("/uploads/", ""));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    // Enregistrer nouvelle image
    const newPath = `/uploads/${config.folder}/${req.file.filename}`;
    user[config.field] = newPath;

    await user.save();
    res.json({ url: newPath, type: req.file.fieldname });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// --- Une seule route générique ---
router.post("/upload", verifyToken, upload.single("image"), uploadAndSave);

export default router;
