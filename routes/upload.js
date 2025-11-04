// routes/upload.js - VERSION CORRIGÉE
import express from "express";
import multer from "multer";
import { verifyToken } from "../middleware/auth.js";
import User from "../models/User.js";
import { uploadFile, deleteFile } from "../utils/cloudinaryServer.js";

const router = express.Router();

const IMAGE_TYPES = {
  profileImage: { folder: "users", field: "profilePhoto" },
  coverImage: { folder: "covers", field: "coverPhoto" },
  projectImage: { folder: "projects", field: "projectPhoto" },
  documentImage: { folder: "documents", field: "documentPhoto" },
};

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage, 
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB pour vidéos
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|mov/;
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté'));
    }
  }
});

// ============================================
// 🔧 Fonction helper pour extraire le publicId
// ============================================
const extractPublicId = (url) => {
  if (!url) return null;
  
  // Si c'est déjà un publicId (users/xxx ou posts/xxx)
  if (!url.startsWith('http')) return url;
  
  try {
    // Extraire de l'URL Cloudinary
    // Format: https://res.cloudinary.com/xxx/image/upload/v123456/folder/publicId.ext
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex === -1) return null;
    
    // Tout après 'upload/v123456/' ou 'upload/'
    let pathAfterUpload = urlParts.slice(uploadIndex + 1);
    
    // Enlever la version si présente (v123456)
    if (pathAfterUpload[0].startsWith('v')) {
      pathAfterUpload = pathAfterUpload.slice(1);
    }
    
    // Rejoindre et enlever l'extension
    const fullPath = pathAfterUpload.join('/');
    return fullPath.replace(/\.[^/.]+$/, ''); // Enlever l'extension
  } catch (err) {
    console.error('❌ Erreur extraction publicId:', err);
    return null;
  }
};
// ============================================
// 📤 Upload photo de profil/cover - VERSION CORRIGÉE
// ============================================
const uploadAndSave = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Aucun fichier reçu" });

  // ✅ Récupérer le folder et type depuis le body
  const folder = req.body.folder || 'users';
  const type = req.body.type || 'profile';

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    // Déterminer le champ à mettre à jour
    const fieldName = type === 'cover' ? 'coverPhoto' : 'profilePhoto';

    // ✅ Supprimer ancienne image sur Cloudinary si elle existe
    if (user[fieldName]) {
      const oldPublicId = extractPublicId(user[fieldName]);
      if (oldPublicId) {
        try {
          await deleteFile(oldPublicId);
          console.log('🗑️ Ancienne image supprimée:', oldPublicId);
        } catch (err) {
          console.error('⚠️ Erreur suppression ancienne image:', err);
        }
      }
    }

    // ✅ Upload sur Cloudinary
    const result = await uploadFile(
      req.file.buffer, 
      folder, 
      req.file.originalname,
      'image'
    );
    console.log('✅ Upload Cloudinary réussi:', result);

    // ✅ CRITIQUE: Retourner l'URL complète, pas le public_id
    res.json({ 
      success: true,
      publicId: result.public_id,
      url: result.secure_url, // ✅ URL complète Cloudinary
      secure_url: result.secure_url,
      type: type,
      field: fieldName
    });
  } catch (err) {
    console.error('❌ Erreur upload:', err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};

// ============================================
// 📤 Upload médias pour POSTS (nouveau)
// ============================================
const uploadPostMedia = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "Aucun fichier reçu" });
  }

  try {
    const uploadedFiles = [];

    for (const file of req.files) {
      const isVideo = file.mimetype.startsWith('video/');
      const folder = 'posts';
      
      // ✅ Upload sur Cloudinary
      const result = await uploadFile(
        file.buffer, 
        folder, 
        file.originalname,
        isVideo ? 'video' : 'image'
      );

      console.log('✅ Média uploadé:', result);

      // ✅ Construire le publicId
      const publicId = `${folder}/${result.public_id.split('/').pop()}`;

      uploadedFiles.push({
        publicId: publicId,
        url: result.secure_url,
        type: isVideo ? 'video' : 'image',
        format: result.format,
        size: result.bytes
      });
    }

    res.json({ 
      success: true,
      files: uploadedFiles 
    });

  } catch (err) {
    console.error('❌ Erreur upload médias:', err);
    res.status(500).json({ 
      success: false,
      message: "Erreur upload médias", 
      error: err.message 
    });
  }
};

// ============================================
// 🗑️ Supprimer un fichier Cloudinary
// ============================================
const deleteUpload = async (req, res) => {
  const { publicId } = req.body;
  
  if (!publicId) {
    return res.status(400).json({ message: "publicId manquant" });
  }

  try {
    await deleteFile(publicId);
    res.json({ 
      success: true,
      message: "Fichier supprimé" 
    });
  } catch (err) {
    console.error('❌ Erreur suppression:', err);
    res.status(500).json({ 
      success: false,
      message: "Erreur suppression", 
      error: err.message 
    });
  }
};

// ============================================
// 📍 Routes
// ============================================

// Upload photo profil/cover (existant)
router.post("/upload", verifyToken, upload.single("image"), uploadAndSave);

// ✅ NOUVEAU : Upload médias pour posts
router.post("/upload-post-media", verifyToken, upload.array("media", 10), uploadPostMedia);

// ✅ NOUVEAU : Supprimer un fichier
router.delete("/delete", verifyToken, deleteUpload);

export default router;
