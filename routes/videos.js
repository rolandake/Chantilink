// backend/routes/videos.js - VERSION CORRIGÉE
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary"; // 🔧 AJOUTÉ
import { verifyToken } from "../middleware/auth.js";
import Video from "../models/Video.js";

const router = express.Router();

// 🔧 Configuration Cloudinary (si pas déjà fait dans server.js)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ------------------------------
// Multer en mémoire
// ------------------------------
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (req, file, cb) => {
    const allowed = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Type de fichier non supporté"), allowed.includes(file.mimetype));
  },
});

// ------------------------------
// Helper : Construire URL complète
// ------------------------------
const buildFullURL = (req, relativePath) => relativePath;

// ------------------------------
// GET - Lister toutes les vidéos
// ------------------------------
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const videos = await Video.find()
      .populate("uploadedBy", "_id username fullName email profilePicture profilePhoto avatar isVerified role isPremium")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Video.countDocuments();

    const videosWithFullURL = videos.map(v => {
      const videoObj = v.toObject();
      if (videoObj.url) videoObj.url = buildFullURL(req, videoObj.url);
      return videoObj;
    });

    res.json({
      videos: videosWithFullURL,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("❌ Erreur GET /videos:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ------------------------------
// GET - Récupérer une vidéo par ID
// ------------------------------
router.get("/:id", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate(
      "uploadedBy",
      "_id username fullName email profilePicture profilePhoto avatar isVerified role isPremium"
    );
    if (!video) return res.status(404).json({ error: "Vidéo non trouvée" });

    const videoObj = video.toObject();
    if (videoObj.url) videoObj.url = buildFullURL(req, videoObj.url);
    res.json(videoObj);
  } catch (err) {
    console.error("❌ Erreur GET /videos/:id:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ------------------------------
// POST - Créer une vidéo (upload Cloudinary)
// ------------------------------
router.post("/", verifyToken, upload.single("video"), async (req, res) => {
  try {
    console.log("📹 Upload vidéo - Début");
    
    if (!req.file) {
      console.log("❌ Aucun fichier reçu");
      return res.status(400).json({ error: "Aucun fichier uploadé" });
    }

    console.log("📦 Fichier reçu:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`
    });

    const { title, description, metadata } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Le titre est obligatoire" });
    }

    // Parser metadata si présent
    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      } catch (e) {
        console.warn("⚠️ Erreur parsing metadata:", e);
      }
    }

    console.log("☁️ Upload vers Cloudinary...");

    // Upload vers Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: "videos",
          // Options d'optimisation
          eager: [
            { 
              streaming_profile: "full_hd",
              format: "m3u8" 
            }
          ],
          eager_async: true,
        },
        (error, result) => {
          if (error) {
            console.error("❌ Erreur Cloudinary:", error);
            reject(error);
          } else {
            console.log("✅ Upload Cloudinary réussi:", result.public_id);
            resolve(result);
          }
        }
      );
      stream.end(req.file.buffer);
    });

    console.log("💾 Sauvegarde en base de données...");

    // Créer le document vidéo
    const newVideo = new Video({
      title: title.trim(),
      description: description?.trim() || "",
      url: result.secure_url,
      uploadedBy: req.user.id,
      startTime: parseFloat(parsedMetadata.startTime) || 0,
      endTime: parseFloat(parsedMetadata.endTime) || 60,
      duration: parseFloat(parsedMetadata.duration) || result.duration || 0,
      filter: parsedMetadata.filter || "none",
      textOverlay: parsedMetadata.textOverlay || "",
      textColor: parsedMetadata.textColor || "#ffffff",
      textPos: {
        x: parseFloat(parsedMetadata.textPosition?.x) || 50,
        y: parseFloat(parsedMetadata.textPosition?.y) || 10,
      },
      musicName: parsedMetadata.musicName || "",
      privacy: parsedMetadata.privacy || "public",
      allowComments: parsedMetadata.allowComments !== false,
      allowDuet: parsedMetadata.allowDuet !== false,
      likes: 0,
      comments: [],
      views: 0,
      isLive: false,
      cloudinary_id: result.public_id,
      thumbnail: result.eager?.[0]?.secure_url || result.secure_url,
    });

    const savedVideo = await newVideo.save();
    const populatedVideo = await savedVideo.populate(
      "uploadedBy",
      "_id username fullName email profilePicture profilePhoto avatar isVerified role isPremium"
    );

    console.log("✅ Vidéo créée avec succès:", savedVideo._id);

    res.status(201).json({
      success: true,
      data: populatedVideo,
      video: populatedVideo,
      message: "Vidéo uploadée avec succès"
    });
  } catch (err) {
    console.error("❌ Erreur POST /videos:", err);
    res.status(500).json({ 
      error: err.message || "Erreur serveur",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// ------------------------------
// POST - Liker une vidéo
// ------------------------------
router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: "Vidéo non trouvée" });

    const userId = req.user.id;
    const hasLiked = video.likedBy?.includes(userId);
    
    if (hasLiked) {
      video.likedBy = video.likedBy.filter(id => id.toString() !== userId);
      video.likes = Math.max(0, (video.likes || 0) - 1);
    } else {
      video.likedBy = [...(video.likedBy || []), userId];
      video.likes = (video.likes || 0) + 1;
    }

    await video.save();
    
    console.log(`${hasLiked ? '💔' : '❤️'} Like vidéo ${req.params.id} par user ${userId}`);
    
    res.json({ success: true, likes: video.likes, userLiked: !hasLiked });
  } catch (err) {
    console.error("❌ Erreur POST /videos/:id/like:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ------------------------------
// POST - Ajouter un commentaire
// ------------------------------
router.post("/:id/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Le commentaire est vide" });

    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: "Vidéo non trouvée" });

    const newComment = {
      _id: new Date().getTime(),
      user: req.user.id,
      text: text.trim(),
      createdAt: new Date(),
    };

    video.comments = [...(video.comments || []), newComment];
    await video.save();

    const populatedVideo = await video.populate({
      path: "comments.user",
      select: "_id username fullName email profilePicture profilePhoto avatar isVerified",
    });

    console.log(`💬 Nouveau commentaire sur vidéo ${req.params.id}`);
    
    res.json({ success: true, comments: populatedVideo.comments });
  } catch (err) {
    console.error("❌ Erreur POST /videos/:id/comment:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ------------------------------
// POST - Incrémenter les vues
// ------------------------------
router.post("/:id/view", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: "Vidéo non trouvée" });

    video.views = (video.views || 0) + 1;
    await video.save();

    res.json({ success: true, views: video.views });
  } catch (err) {
    console.error("❌ Erreur POST /videos/:id/view:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ------------------------------
// DELETE - Supprimer une vidéo
// ------------------------------
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: "Vidéo non trouvée" });

    if (video.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Vous n'avez pas la permission de supprimer cette vidéo" });
    }

    // Supprimer sur Cloudinary
    if (video.cloudinary_id) {
      try {
        await cloudinary.uploader.destroy(video.cloudinary_id, { resource_type: "video" });
        console.log(`🗑️ Vidéo supprimée de Cloudinary: ${video.cloudinary_id}`);
      } catch (cloudError) {
        console.warn("⚠️ Erreur suppression Cloudinary:", cloudError);
        // On continue quand même pour supprimer de la BDD
      }
    }

    await Video.findByIdAndDelete(req.params.id);
    console.log(`✅ Vidéo supprimée: ${req.params.id}`);
    
    res.json({ success: true, message: "Vidéo supprimée" });
  } catch (err) {
    console.error("❌ Erreur DELETE /videos/:id:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ------------------------------
// PUT - Modifier une vidéo
// ------------------------------
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: "Vidéo non trouvée" });

    if (video.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Vous n'avez pas la permission de modifier cette vidéo" });
    }

    const { title, description, privacy, allowComments, allowDuet } = req.body;

    if (title) video.title = title.trim();
    if (description !== undefined) video.description = description.trim();
    if (privacy) video.privacy = privacy;
    if (allowComments !== undefined) video.allowComments = allowComments;
    if (allowDuet !== undefined) video.allowDuet = allowDuet;

    await video.save();
    
    const populatedVideo = await video.populate(
      "uploadedBy",
      "_id username fullName email profilePicture profilePhoto avatar isVerified role isPremium"
    );

    console.log(`✏️ Vidéo modifiée: ${req.params.id}`);
    
    res.json({ success: true, data: populatedVideo });
  } catch (err) {
    console.error("❌ Erreur PUT /videos/:id:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
