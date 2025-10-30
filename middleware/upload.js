// backend/middleware/upload.js
import multer from "multer";
import path from "path";
import fs from "fs";

// === Fonction pour nettoyer les noms de fichiers ===
function cleanFilename(originalName) {
  const parsedName = path.parse(originalName).name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
  
  const ext = path.extname(originalName).toLowerCase();
  return `${parsedName || "file"}${ext}`;
}

// === Crée le dossier uploads/posts (UNIFIÉ) ===
const uploadDir = "uploads/posts";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`✅ Dossier créé: ${uploadDir}`);
}

// === Configuration du stockage Multer ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const cleanName = cleanFilename(file.originalname);
    cb(null, `media-${uniqueSuffix}-${cleanName}`);
  },
});

// === Limites par type ===
const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,   // 10 MB
  video: 500 * 1024 * 1024,  // 500 MB
};

// === Configuration du middleware Multer ===
const multerMiddleware = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const imageTypes = /jpeg|jpg|png|pdf/;
    const videoTypes = /mp4|mov|avi|mkv/;
    
    if (imageTypes.test(ext) || videoTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Type de fichier non autorisé"));
    }
  },
  limits: { fileSize: FILE_SIZE_LIMITS.video },
}).array("media", 5); // 🎯 Support multi-fichiers

// === Middleware principal ===
export const uploadWithLimits = (req, res, next) => {
  console.log("=== UPLOAD DEBUG START ===");

  multerMiddleware(req, res, (err) => {
    if (err) {
      console.error("❌ Multer error:", err.message);
      return res.status(400).json({ error: err.message });
    }

    const files = req.files;
    if (!files || files.length === 0) {
      console.log("⚠️ Aucun fichier (post texte uniquement)");
      console.log("=== UPLOAD DEBUG END ===");
      return next();
    }

    // Vérification de taille
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const maxSize = ext.match(/jpeg|jpg|png|pdf/)
        ? FILE_SIZE_LIMITS.image
        : FILE_SIZE_LIMITS.video;

      if (file.size > maxSize) {
        console.warn(`⚠️ Fichier trop volumineux : ${file.size} > ${maxSize}`);
        return res.status(400).json({
          error: `Fichier trop volumineux. Max: ${maxSize / (1024 * 1024)} MB`,
        });
      }

      console.log("✅ Fichier uploadé :", file.originalname);
      console.log("📁 Nom nettoyé :", file.filename);
      console.log("📂 Chemin complet :", file.path);
      console.log("📏 Taille :", (file.size / 1024).toFixed(2), "KB");
      console.log("📌 MIME :", file.mimetype);
    }

    console.log("=== UPLOAD DEBUG END ===");
    next();
  });
};

// === Gestionnaire d’erreurs Multer ===
export function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    console.error("❌ Erreur Multer:", err.message);
    return res.status(400).json({ error: err.message });
  } else if (err) {
    console.error("❌ Erreur upload:", err);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
  next();
}
