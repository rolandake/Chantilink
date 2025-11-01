import express from "express";
import multer from "multer";
import { verifyToken } from "../middleware/auth.js";
import User from "../models/User.js";
import { uploadFile } from "../utils/cloudinaryServer.js";

const router = express.Router();

const IMAGE_TYPES = {
  profileImage: { folder: "profiles", field: "profilePhoto" },
  coverImage: { folder: "covers", field: "coverPhoto" },
  projectImage: { folder: "projects", field: "projectPhoto" },
  documentImage: { folder: "documents", field: "documentPhoto" },
};

// Multer memory storage (on n’écrit plus sur disque)
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const uploadAndSave = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Aucun fichier reçu" });

  const config = IMAGE_TYPES[req.file.fieldname];
  if (!config) return res.status(400).json({ message: "Type d’image non reconnu" });

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    // Supprimer ancienne image sur Cloudinary si elle existe
    if (user[config.field]) {
      const parts = user[config.field].split("/");
      const publicIdWithExt = parts[parts.length - 1];
      const publicId = publicIdWithExt.split(".")[0];
      await uploadFile(null, `${config.folder}/${publicId}`, null, "destroy"); // utiliser la fonction de suppression si tu l’as
    }

    // Upload sur Cloudinary
    const result = await uploadFile(req.file.buffer, config.folder, req.file.originalname);

    user[config.field] = result.secure_url; // ✅ URL HTTPS
    await user.save();

    res.json({ url: result.secure_url, type: req.file.fieldname });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};

router.post("/upload", verifyToken, upload.single("image"), uploadAndSave);

export default router;
