// Backend: routes/videos.js - CORRECTION COMPLÈTE

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { verifyToken } from "../middleware/auth.js";
import Video from "../models/Video.js";

const router = express.Router();

// Configuration multer pour les vidéos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/videos";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "video-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Type de fichier non supporté"));
    }
  },
});

// Helper: Construire l'URL complète
const buildFullURL = (req, relativePath) => {
  if (!relativePath) return null;
  const protocol = req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}${relativePath}`;
};

// ========================================
// GET - Lister toutes les vidéos
// ========================================
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ✅ CORRECTION : Populate avec TOUS les champs nécessaires
    const videos = await Video.find()
      .populate("uploadedBy", "_id username fullName email profilePicture profilePhoto avatar isVerified role isPremium")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Video.countDocuments();

    // Construire les URLs complètes
    const videosWithFullURL = videos.map((v) => {
      const videoObj = v.toObject();
      
      // URL de la vidéo
      if (videoObj.url) {
        videoObj.url = buildFullURL(req, videoObj.url);
      }
      
      // ✅ CORRECTION : URL de la photo de profil
      if (videoObj.uploadedBy && videoObj.uploadedBy.profilePicture && !videoObj.uploadedBy.profilePicture.startsWith('http')) {
        videoObj.uploadedBy.profilePicture = buildFullURL(req, videoObj.uploadedBy.profilePicture);
      }
      if (videoObj.uploadedBy && videoObj.uploadedBy.profilePhoto && !videoObj.uploadedBy.profilePhoto.startsWith('http')) {
        videoObj.uploadedBy.profilePhoto = buildFullURL(req, videoObj.uploadedBy.profilePhoto);
      }
      if (videoObj.uploadedBy && videoObj.uploadedBy.avatar && !videoObj.uploadedBy.avatar.startsWith('http')) {
        videoObj.uploadedBy.avatar = buildFullURL(req, videoObj.uploadedBy.avatar);
      }

      return videoObj;
    });

    res.json({
      videos: videosWithFullURL,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Erreur GET /videos:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ========================================
// GET - Récupérer une vidéo par ID
// ========================================
router.get("/:id", async (req, res) => {
  try {
    // ✅ CORRECTION : Populate avec TOUS les champs
    const video = await Video.findById(req.params.id).populate(
      "uploadedBy",
      "_id username fullName email profilePicture profilePhoto avatar isVerified role isPremium"
    );

    if (!video) {
      return res.status(404).json({ error: "Vidéo non trouvée" });
    }

    // Construire l'URL complète
    const videoObj = video.toObject();
    if (videoObj.url) {
      videoObj.url = buildFullURL(req, videoObj.url);
    }
    
    // URL photo de profil
    if (videoObj.uploadedBy && videoObj.uploadedBy.profilePicture && !videoObj.uploadedBy.profilePicture.startsWith('http')) {
      videoObj.uploadedBy.profilePicture = buildFullURL(req, videoObj.uploadedBy.profilePicture);
    }
    if (videoObj.uploadedBy && videoObj.uploadedBy.profilePhoto && !videoObj.uploadedBy.profilePhoto.startsWith('http')) {
      videoObj.uploadedBy.profilePhoto = buildFullURL(req, videoObj.uploadedBy.profilePhoto);
    }

    res.json(videoObj);
  } catch (err) {
    console.error("Erreur GET /videos/:id:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ========================================
// POST - Créer une vidéo (avec upload)
// ========================================
router.post("/", verifyToken, upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier uploadé" });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      filter,
      textOverlay,
      textColor,
      textPosX,
      textPosY,
    } = req.body;

    if (!title) {
      // Supprimer le fichier uploadé
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Erreur suppression fichier:", err);
      });
      return res.status(400).json({ error: "Le titre est obligatoire" });
    }

    // Construire le chemin relatif
    const videoPath = `/uploads/videos/${req.file.filename}`;

    const newVideo = new Video({
      title: title.trim(),
      description: description?.trim() || "",
      url: videoPath,
      uploadedBy: req.user.id,
      startTime: parseFloat(startTime) || 0,
      endTime: parseFloat(endTime) || 0,
      filter: filter || "none",
      textOverlay: textOverlay || "",
      textColor: textColor || "#ffffff",
      textPos: {
        x: parseFloat(textPosX) || 50,
        y: parseFloat(textPosY) || 10,
      },
      likes: 0,
      comments: [],
      views: 0,
      isLive: false,
    });

    const savedVideo = await newVideo.save();
    
    // ✅ CORRECTION : Populate avec TOUS les champs
    const populatedVideo = await savedVideo.populate(
      "uploadedBy",
      "_id username fullName email profilePicture profilePhoto avatar isVerified role isPremium"
    );

    // Retourner avec URL complète
    const videoObj = populatedVideo.toObject();
    videoObj.url = buildFullURL(req, videoObj.url);
    
    // URL photo de profil
    if (videoObj.uploadedBy) {
      if (videoObj.uploadedBy.profilePicture && !videoObj.uploadedBy.profilePicture.startsWith('http')) {
        videoObj.uploadedBy.profilePicture = buildFullURL(req, videoObj.uploadedBy.profilePicture);
      }
      if (videoObj.uploadedBy.profilePhoto && !videoObj.uploadedBy.profilePhoto.startsWith('http')) {
        videoObj.uploadedBy.profilePhoto = buildFullURL(req, videoObj.uploadedBy.profilePhoto);
      }
      if (videoObj.uploadedBy.avatar && !videoObj.uploadedBy.avatar.startsWith('http')) {
        videoObj.uploadedBy.avatar = buildFullURL(req, videoObj.uploadedBy.avatar);
      }
    }

    console.log("✅ Video créée:", savedVideo._id);
    console.log("👤 Utilisateur populé:", videoObj.uploadedBy);
    
    res.status(201).json(videoObj);
  } catch (err) {
    console.error("Erreur POST /videos:", err);

    // Supprimer le fichier en cas d'erreur
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error("Erreur suppression fichier:", unlinkErr);
      });
    }

    res.status(500).json({ error: err.message || "Erreur serveur" });
  }
});

// ========================================
// GET - Vidéos d'un utilisateur
// ========================================
router.get("/user/:userId", async (req, res) => {
  try {
    const videos = await Video.find({ uploadedBy: req.params.userId })
      .populate("uploadedBy", "_id username fullName email profilePicture profilePhoto avatar isVerified role isPremium")
      .sort({ createdAt: -1 });

    // URLs complètes
    const videosWithFullURL = videos.map((v) => {
      const videoObj = v.toObject();
      if (videoObj.url) {
        videoObj.url = buildFullURL(req, videoObj.url);
      }
      if (videoObj.uploadedBy && videoObj.uploadedBy.profilePicture && !videoObj.uploadedBy.profilePicture.startsWith('http')) {
        videoObj.uploadedBy.profilePicture = buildFullURL(req, videoObj.uploadedBy.profilePicture);
      }
      if (videoObj.uploadedBy && videoObj.uploadedBy.profilePhoto && !videoObj.uploadedBy.profilePhoto.startsWith('http')) {
        videoObj.uploadedBy.profilePhoto = buildFullURL(req, videoObj.uploadedBy.profilePhoto);
      }
      return videoObj;
    });

    res.json(videosWithFullURL);
  } catch (err) {
    console.error("Erreur GET /videos/user/:userId:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ========================================
// POST - Liker une vidéo
// ========================================
router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: "Vidéo non trouvée" });
    }

    const userId = req.user.id;
    const hasLiked = video.likedBy?.includes(userId);

    if (hasLiked) {
      video.likedBy = video.likedBy.filter((id) => id.toString() !== userId);
      video.likes = Math.max(0, (video.likes || 0) - 1);
    } else {
      video.likedBy = [...(video.likedBy || []), userId];
      video.likes = (video.likes || 0) + 1;
    }

    await video.save();

    res.json({
      success: true,
      likes: video.likes,
      userLiked: !hasLiked,
    });
  } catch (err) {
    console.error("Erreur POST /videos/:id/like:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ========================================
// POST - Ajouter un commentaire
// ========================================
router.post("/:id/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ error: "Le commentaire est vide" });
    }

    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: "Vidéo non trouvée" });
    }

    const newComment = {
      _id: new Date().getTime(),
      user: req.user.id,
      text: text.trim(),
      createdAt: new Date(),
    };

    video.comments = [...(video.comments || []), newComment];
    await video.save();

    // ✅ CORRECTION : Populate commentaires avec tous les champs
    const populatedVideo = await video.populate({
      path: "comments.user",
      select: "_id username fullName email profilePicture profilePhoto avatar isVerified",
    });

    res.json({
      success: true,
      comments: populatedVideo.comments,
    });
  } catch (err) {
    console.error("Erreur POST /videos/:id/comment:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ========================================
// POST - Incrémenter les vues
// ========================================
router.post("/:id/view", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: "Vidéo non trouvée" });
    }

    video.views = (video.views || 0) + 1;
    await video.save();

    res.json({
      success: true,
      views: video.views,
    });
  } catch (err) {
    console.error("Erreur POST /videos/:id/view:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ========================================
// DELETE - Supprimer une vidéo
// ========================================
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: "Vidéo non trouvée" });
    }

    // Vérifier que c'est l'auteur
    if (video.uploadedBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Vous n'avez pas la permission de supprimer cette vidéo" });
    }

    // Supprimer le fichier
    if (video.url) {
      const filePath = path.join(process.cwd(), video.url);
      fs.unlink(filePath, (err) => {
        if (err) console.error("Erreur suppression fichier:", err);
      });
    }

    await Video.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Vidéo supprimée" });
  } catch (err) {
    console.error("Erreur DELETE /videos/:id:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;