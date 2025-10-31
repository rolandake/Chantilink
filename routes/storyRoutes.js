// backend/routes/storyRoutes.js - SYSTÈME COMPLET
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import Story from "../models/Story.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../services/cloudinaryService.js";

const router = express.Router();

// ============================================
// MULTER CONFIGURATION
// ============================================
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const dir = "uploads/stories";
    try {
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/quicktime"
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Format non supporté. Utilisez JPG, PNG, GIF, MP4 ou WebM."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// ============================================
// CREATE STORY (Ajoute slide à story existante ou crée nouvelle)
// ============================================
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  try {
    console.log("📥 Création/Ajout story...");
    console.log("Body:", req.body);
    console.log("File:", req.file ? req.file.originalname : "Aucun");

    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier fourni" });
    }

    const { caption, type, duration = 5000, hashtags, visibility = "public" } = req.body;

    // Upload vers Cloudinary
    console.log("☁️ Upload vers Cloudinary...");
    const uploadResult = await uploadToCloudinary(req.file.path, "stories");
    console.log("✅ Upload Cloudinary réussi:", uploadResult.secureUrl);

    // Supprimer fichier local après upload
    try {
      await fs.unlink(req.file.path);
    } catch (err) {
      console.error("Erreur suppression fichier local:", err);
    }

    // Chercher story active de l'utilisateur (moins de 24h)
    let story = await Story.findOne({
      owner: req.user.id,
      expiresAt: { $gt: new Date() },
      archived: { $ne: true },
    });

    // Créer nouvelle slide
    const newSlide = {
      media: uploadResult.secureUrl,
      type: type || (req.file.mimetype.startsWith("image") ? "image" : "video"),
      text: caption || "",
      views: [],
      reactions: [],
      mentions: [],
      duration: parseInt(duration) || 5000,
    };

    if (story) {
      // Ajouter slide à story existante
      story.slides.push(newSlide);
      
      // Mettre à jour hashtags si fournis
      if (hashtags) {
        const hashtagsArray = Array.isArray(hashtags) 
          ? hashtags 
          : hashtags.split(',').map(h => h.trim().toLowerCase());
        
        story.hashtags = [...new Set([...story.hashtags, ...hashtagsArray])];
      }
      
      await story.save();
      console.log(`✅ Slide ajoutée (total: ${story.slides.length})`);
    } else {
      // Créer nouvelle story
      const hashtagsArray = hashtags 
        ? (Array.isArray(hashtags) ? hashtags : hashtags.split(',').map(h => h.trim().toLowerCase()))
        : [];

      story = await Story.create({
        owner: req.user.id,
        slides: [newSlide],
        hashtags: hashtagsArray,
        visibility: visibility || "public",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      console.log("✅ Nouvelle story créée:", story._id);
    }

    // Populer owner
    await story.populate("owner", "fullName username profilePhoto");

    // Émettre via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.emit("newStory", {
        story,
        userId: req.user.id,
        isNewSlide: story.slides.length > 1,
      });
      console.log("📡 Event Socket émis: newStory");
    }

    res.status(201).json({
      success: true,
      message: story.slides.length === 1 ? "Story créée avec succès" : "Slide ajoutée avec succès",
      story,
    });
  } catch (error) {
    console.error("❌ Erreur création story:", error);
    
    // Nettoyer fichier local en cas d'erreur
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        console.error("Erreur nettoyage fichier:", err);
      }
    }
    
    res.status(500).json({ error: error.message || "Erreur serveur" });
  }
});

// ============================================
// GET ALL ACTIVE STORIES (Suivis + Own)
// ============================================
router.get("/", verifyToken, async (req, res) => {
  try {
    console.log("📖 Récupération stories actives...");

    // Récupérer liste des suivis
    const currentUser = await User.findById(req.user.id).select("following");
    const followingIds = currentUser?.following || [];

    // Stories: propres + suivis (selon visibilité)
    const stories = await Story.find({
      $or: [
        { owner: req.user.id },
        { 
          owner: { $in: followingIds }, 
          visibility: { $in: ["public", "followers"] } 
        },
        { visibility: "public" } // Stories publiques
      ],
      expiresAt: { $gt: new Date() },
      archived: { $ne: true },
    })
      .populate("owner", "fullName username profilePhoto")
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ ${stories.length} stories actives trouvées`);

    res.json({
      success: true,
      count: stories.length,
      stories,
    });
  } catch (error) {
    console.error("❌ Erreur récupération stories:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET SINGLE STORY
// ============================================
router.get("/:storyId", verifyToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
      .populate("owner", "fullName username profilePhoto")
      .populate("slides.views", "fullName username profilePhoto")
      .lean();

    if (!story) {
      return res.status(404).json({ error: "Story non trouvée" });
    }

    // Vérifier expiration
    if (new Date(story.expiresAt) < new Date()) {
      return res.status(410).json({ error: "Story expirée" });
    }

    // Vérifier permissions
    const isOwner = story.owner._id.toString() === req.user.id;
    const currentUser = await User.findById(req.user.id).select("following");
    const isFollowing = currentUser?.following?.some(
      f => f.toString() === story.owner._id.toString()
    );

    if (story.visibility === "private" && !isOwner) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }

    if (story.visibility === "followers" && !isOwner && !isFollowing) {
      return res.status(403).json({ error: "Accès réservé aux abonnés" });
    }

    res.json({
      success: true,
      story,
    });
  } catch (error) {
    console.error("❌ Erreur récupération story:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET MY STORIES (Toutes: actives + archivées)
// ============================================
router.get("/my/all", verifyToken, async (req, res) => {
  try {
    const stories = await Story.find({
      owner: req.user.id,
    })
      .populate("owner", "fullName username profilePhoto")
      .populate("slides.views", "fullName username profilePhoto")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: stories.length,
      stories,
    });
  } catch (error) {
    console.error("❌ Erreur récupération mes stories:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INCREMENT VIEW (Optimisé - 1 vue par user)
// ============================================
router.post("/:storyId/slides/:slideIndex/view", verifyToken, async (req, res) => {
  try {
    const { storyId, slideIndex } = req.params;
    const slideIdx = parseInt(slideIndex);

    if (isNaN(slideIdx) || slideIdx < 0) {
      return res.status(400).json({ error: "Index invalide" });
    }

    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({ error: "Story non trouvée" });
    }

    if (!story.slides[slideIdx]) {
      return res.status(404).json({ error: "Slide non trouvée" });
    }

    const slide = story.slides[slideIdx];
    
    // Vérifier si déjà vue par cet utilisateur
    const alreadyViewed = slide.views.some(
      v => v.toString() === req.user.id
    );

    if (!alreadyViewed) {
      slide.views.push(req.user.id);
      await story.save();

      console.log(`👁️ Vue ajoutée: Story ${storyId}, Slide ${slideIdx} par ${req.user.id}`);

      // Socket emit
      const io = req.app.get("io");
      if (io) {
        io.to(`story-${storyId}`).emit("slideViewed", {
          storyId,
          slideIndex: slideIdx,
          userId: req.user.id,
          viewsCount: slide.views.length,
        });
      }
    }

    res.json({
      success: true,
      viewsCount: slide.views.length,
      alreadyViewed,
    });
  } catch (error) {
    console.error("❌ Erreur vue slide:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ADD REACTION TO SLIDE
// ============================================
router.post("/:storyId/slides/:slideIndex/reaction", verifyToken, async (req, res) => {
  try {
    const { storyId, slideIndex } = req.params;
    const { reaction } = req.body;

    if (!reaction) {
      return res.status(400).json({ error: "Réaction manquante" });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: "Story non trouvée" });
    }

    const slideIdx = parseInt(slideIndex);
    const slide = story.slides[slideIdx];

    if (!slide) {
      return res.status(404).json({ error: "Slide non trouvée" });
    }

    // Ajouter réaction
    slide.reactions.push({
      user: req.user.id,
      emoji: reaction,
      createdAt: new Date(),
    });

    await story.save();

    // Socket emit
    const io = req.app.get("io");
    if (io) {
      io.to(`story-${storyId}`).emit("receiveStoryReaction", {
        storyId,
        slideIndex: slideIdx,
        reaction,
        userId: req.user.id,
      });
    }

    res.json({
      success: true,
      message: "Réaction ajoutée",
      reactions: slide.reactions,
    });
  } catch (error) {
    console.error("❌ Erreur ajout réaction:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DELETE ENTIRE STORY
// ============================================
router.delete("/:storyId", verifyToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);

    if (!story) {
      return res.status(404).json({ error: "Story non trouvée" });
    }

    if (story.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    // Supprimer tous les médias de Cloudinary
    for (const slide of story.slides) {
      try {
        const urlParts = slide.media.split('/');
        const filenameWithExt = urlParts[urlParts.length - 1];
        const publicId = filenameWithExt.split('.')[0];
        const folder = urlParts[urlParts.length - 2];
        
        await deleteFromCloudinary(`${folder}/${publicId}`);
        console.log(`🗑️ Média supprimé: ${folder}/${publicId}`);
      } catch (err) {
        console.error("Erreur suppression Cloudinary:", err);
      }
    }

    await Story.findByIdAndDelete(req.params.storyId);

    // Socket emit
    const io = req.app.get("io");
    if (io) {
      io.emit("storyDeleted", {
        storyId: req.params.storyId,
        userId: req.user.id,
      });
    }

    console.log("✅ Story supprimée:", req.params.storyId);

    res.json({
      success: true,
      message: "Story supprimée avec succès",
    });
  } catch (error) {
    console.error("❌ Erreur suppression story:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DELETE SINGLE SLIDE
// ============================================
router.delete("/:storyId/slides/:slideIndex", verifyToken, async (req, res) => {
  try {
    const { storyId, slideIndex } = req.params;
    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({ error: "Story non trouvée" });
    }

    if (story.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    const slideIdx = parseInt(slideIndex);
    const slide = story.slides[slideIdx];

    if (!slide) {
      return res.status(404).json({ error: "Slide non trouvée" });
    }

    // Supprimer média de Cloudinary
    try {
      const urlParts = slide.media.split('/');
      const filenameWithExt = urlParts[urlParts.length - 1];
      const publicId = filenameWithExt.split('.')[0];
      const folder = urlParts[urlParts.length - 2];
      
      await deleteFromCloudinary(`${folder}/${publicId}`);
      console.log(`🗑️ Média supprimé: ${folder}/${publicId}`);
    } catch (err) {
      console.error("Erreur suppression Cloudinary:", err);
    }

    // Supprimer slide du tableau
    story.slides.splice(slideIdx, 1);

    // Si plus de slides, supprimer story entière
    if (story.slides.length === 0) {
      await Story.findByIdAndDelete(storyId);
      
      const io = req.app.get("io");
      if (io) {
        io.emit("storyDeleted", { storyId, userId: req.user.id });
      }
      
      console.log("✅ Story supprimée (plus de slides)");
      
      return res.json({
        success: true,
        message: "Story supprimée (dernière slide)",
        deleted: true,
      });
    }

    await story.save();

    console.log(`✅ Slide ${slideIdx} supprimée (reste ${story.slides.length} slides)`);

    res.json({
      success: true,
      message: "Slide supprimée",
      story,
      deleted: false,
    });
  } catch (error) {
    console.error("❌ Erreur suppression slide:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ARCHIVE STORY
// ============================================
router.post("/:storyId/archive", verifyToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);

    if (!story) {
      return res.status(404).json({ error: "Story non trouvée" });
    }

    if (story.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    story.archived = true;
    story.archivedAt = new Date();
    await story.save();

    console.log("📦 Story archivée:", req.params.storyId);

    res.json({
      success: true,
      message: "Story archivée avec succès",
    });
  } catch (error) {
    console.error("❌ Erreur archivage story:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET ARCHIVED STORIES
// ============================================
router.get("/archived/list", verifyToken, async (req, res) => {
  try {
    const archived = await Story.find({
      owner: req.user.id,
      archived: true,
    })
      .populate("owner", "fullName username profilePhoto")
      .populate("slides.views", "fullName username profilePhoto")
      .sort({ archivedAt: -1 })
      .lean();

    res.json({
      success: true,
      count: archived.length,
      stories: archived,
    });
  } catch (error) {
    console.error("❌ Erreur récupération archives:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET ANALYTICS
// ============================================
router.get("/:storyId/analytics", verifyToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
      .populate("slides.views", "fullName username profilePhoto");

    if (!story) {
      return res.status(404).json({ error: "Story non trouvée" });
    }

    if (story.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    // Calculer stats
    const totalViews = story.slides.reduce((sum, s) => sum + s.views.length, 0);
    const uniqueViewers = new Set();
    
    story.slides.forEach(s => {
      s.views.forEach(v => uniqueViewers.add(v._id.toString()));
    });

    const analytics = {
      totalSlides: story.slides.length,
      totalViews,
      uniqueViewers: uniqueViewers.size,
      viewersList: Array.from(uniqueViewers),
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      hoursRemaining: Math.max(
        0,
        Math.floor((new Date(story.expiresAt) - new Date()) / (1000 * 60 * 60))
      ),
      slidesAnalytics: story.slides.map((s, i) => ({
        index: i,
        type: s.type,
        views: s.views.length,
        reactions: s.reactions.length,
        text: s.text || null,
      })),
    };

    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error("❌ Erreur analytics:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CLEANUP EXPIRED STORIES (Cron job)
// ============================================
router.post("/cleanup/expired", async (req, res) => {
  try {
    const expiredStories = await Story.find({
      expiresAt: { $lt: new Date() },
      archived: { $ne: true },
    });

    console.log(`🧹 Nettoyage: ${expiredStories.length} stories expirées`);

    let deletedCount = 0;

    for (const story of expiredStories) {
      // Supprimer médias Cloudinary
      for (const slide of story.slides) {
        try {
          const urlParts = slide.media.split('/');
          const filenameWithExt = urlParts[urlParts.length - 1];
          const publicId = filenameWithExt.split('.')[0];
          const folder = urlParts[urlParts.length - 2];
          
          await deleteFromCloudinary(`${folder}/${publicId}`);
        } catch (err) {
          console.error("Erreur suppression média:", err);
        }
      }
      
      await Story.findByIdAndDelete(story._id);
      deletedCount++;
    }

    console.log(`✅ ${deletedCount} stories nettoyées`);

    res.json({
      success: true,
      message: `${deletedCount} stories expirées supprimées`,
      deletedCount,
    });
  } catch (error) {
    console.error("❌ Erreur nettoyage:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;