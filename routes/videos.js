// backend/routes/videos.js - Cloudinary-ready
import express from "express";
import multer from "multer";
import { uploadFile } from "../utils/cloudinaryServer.js";
import { verifyToken } from "../middleware/auth.js";
import Video from "../models/Video.js";

const router = express.Router();

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
    console.error("Erreur GET /videos:", err);
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
    console.error("Erreur GET /videos/:id:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ------------------------------
// POST - Créer une vidéo (upload Cloudinary)
// ------------------------------
router.post("/", verifyToken, upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier uploadé" });
    const { title, description, startTime, endTime, filter, textOverlay, textColor, textPosX, textPosY } = req.body;

    if (!title) return res.status(400).json({ error: "Le titre est obligatoire" });

    // Upload vers Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "video", folder: "videos" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    const newVideo = new Video({
      title: title.trim(),
      description: description?.trim() || "",
      url: result.secure_url,
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
      cloudinary_id: result.public_id,
    });

    const savedVideo = await newVideo.save();
    const populatedVideo = await savedVideo.populate(
      "uploadedBy",
      "_id username fullName email profilePicture profilePhoto avatar isVerified role isPremium"
    );

    res.status(201).json(populatedVideo);
  } catch (err) {
    console.error("Erreur POST /videos:", err);
    res.status(500).json({ error: err.message || "Erreur serveur" });
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
    res.json({ success: true, likes: video.likes, userLiked: !hasLiked });
  } catch (err) {
    console.error("Erreur POST /videos/:id/like:", err);
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

    res.json({ success: true, comments: populatedVideo.comments });
  } catch (err) {
    console.error("Erreur POST /videos/:id/comment:", err);
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
    console.error("Erreur POST /videos/:id/view:", err);
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
      await cloudinary.uploader.destroy(video.cloudinary_id, { resource_type: "video" });
    }

    await Video.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Vidéo supprimée" });
  } catch (err) {
    console.error("Erreur DELETE /videos/:id:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
