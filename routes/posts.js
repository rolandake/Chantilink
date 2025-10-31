// backend/routes/postsRoutes.js
import express from "express";
import path from "path";
import fs from "fs";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";
import { uploadWithLimits, handleMulterError } from "../middleware/upload.js";

const router = express.Router();

// --- Helpers ---
const getMediaUrl = (req, file) => {
  return `${req.protocol}://${req.get("host")}/uploads/posts/${file.filename}`;
};

const deleteFile = (mediaUrl) => {
  if (!mediaUrl) return;
  try {
    const filePath = path.join(process.cwd(), new URL(mediaUrl).pathname);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("🗑️ Fichier supprimé:", filePath);
    }
  } catch (err) {
    console.error("❌ Erreur suppression fichier:", err);
  }
};

// Helper pour récupérer les infos complètes de l'utilisateur (avec certification)
const getUserInfo = async (userId) => {
  try {
    const user = await User.findById(userId).select('_id username fullName profilePhoto isVerified isPremium role');
    if (!user) {
      console.warn(`⚠️ Utilisateur ${userId} introuvable`);
      return null;
    }
    return {
      _id: user._id,
      username: user.username,
      fullName: user.fullName || user.username,
      profilePhoto: user.profilePhoto,
      isVerified: user.isVerified || false,
      isPremium: user.isPremium || false,
    };
  } catch (err) {
    console.error("❌ Erreur getUserInfo:", err);
    return null;
  }
};

// --- CRUD POSTS ---

// CREATE POST
router.post(
  "/",
  verifyToken,
  uploadWithLimits,
  handleMulterError,
  async (req, res) => {
    try {
      const { content, location, privacy } = req.body;

      if (!content?.trim() && (!req.files || req.files.length === 0)) {
        return res.status(400).json({ error: "Le post est vide" });
      }

      const userInfo = await getUserInfo(req.user.id);
      if (!userInfo) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const mediaUrls = req.files ? req.files.map(f => getMediaUrl(req, f)) : [];
      const mediaType = req.files && req.files.length > 0
        ? (req.files[0].mimetype.startsWith("video") ? "video" : "image")
        : null;

      const newPost = new Post({
        user: userInfo,
        content: content || "",
        media: mediaUrls,
        mediaType,
        location,
        privacy: privacy || "Public",
        likes: [],
        views: [],
        comments: [],
        shares: []
      });

      await newPost.save();
      console.log("✅ Post créé:", newPost._id, "par", userInfo.fullName);
      res.status(201).json(newPost);
    } catch (err) {
      console.error("❌ Erreur création post:", err);
      
      if (req.files) {
        req.files.forEach(file => {
          const filePath = path.join(process.cwd(), "uploads/posts", file.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
      }
      
      res.status(500).json({ error: "Erreur serveur", details: err.message });
    }
  }
);

// UPDATE POST
router.put(
  "/:id",
  verifyToken,
  uploadWithLimits,
  handleMulterError,
  async (req, res) => {
    try {
      const { id } = req.params;
      const post = await Post.findById(id);

      if (!post) {
        return res.status(404).json({ error: "Post non trouvé" });
      }

      if (post.user._id.toString() !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Non autorisé" });
      }

      const { content, location, privacy } = req.body;
      if (content !== undefined) post.content = content;
      if (location !== undefined) post.location = location;
      if (privacy) post.privacy = privacy;

      if (req.files && req.files.length > 0) {
        if (post.media && post.media.length > 0) {
          post.media.forEach(deleteFile);
        }
        post.media = req.files.map(f => getMediaUrl(req, f));
        post.mediaType = req.files[0].mimetype.startsWith("video") ? "video" : "image";
      }

      await post.save();
      console.log("✅ Post modifié:", post._id);
      res.json({ message: "Post modifié", post });
    } catch (err) {
      console.error("❌ Erreur modification post:", err);
      res.status(500).json({ error: "Erreur serveur", details: err.message });
    }
  }
);

// DELETE POST
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post non trouvé" });
    }

    if (post.user._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Non autorisé" });
    }

    if (post.media && post.media.length > 0) {
      post.media.forEach(deleteFile);
    }

    await post.deleteOne();
    console.log("✅ Post supprimé:", req.params.id);
    res.json({ message: "Post supprimé" });
  } catch (err) {
    console.error("❌ Erreur suppression post:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// GET ALL POSTS (avec pagination) - ✅ CORRIGÉ
router.get("/", verifyToken, async (req, res) => {
  try {
    let { userId, page = 1, limit = 20 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // ✅ CORRECTION: Utiliser $or pour chercher soit dans user._id soit dans user
    let query = {};
    if (userId) {
      query = {
        $or: [
          { "user._id": userId },  // Si user est un objet
          { user: userId }          // Si user est juste un ID
        ]
      };
    }

    const totalPosts = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Enrichir les posts avec les données utilisateur à jour (certification)
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        try {
          // Extraire l'ID utilisateur (qu'il soit objet ou string)
          const userId = post.user?._id || post.user;
          const userInfo = await getUserInfo(userId);
          if (userInfo) {
            post.user = userInfo;
          }
          return post;
        } catch (err) {
          console.warn("Erreur enrichissement post:", err);
          return post;
        }
      })
    );

    console.log(`✅ ${enrichedPosts.length} posts récupérés (page ${page}) ${userId ? `pour user ${userId}` : ''}`);
    res.json({ posts: enrichedPosts, hasMore: page * limit < totalPosts });
  } catch (err) {
    console.error("❌ Erreur récupération posts:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// GET POST BY ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post non trouvé" });
    }

    // Enrichir avec données utilisateur à jour
    const userId = post.user?._id || post.user;
    const userInfo = await getUserInfo(userId);
    if (userInfo) {
      post.user = userInfo;
    }

    res.json(post);
  } catch (err) {
    console.error("❌ Erreur récupération post:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// --- INTERACTIONS ---

// LIKE POST
router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post non trouvé" });

    const userId = req.user.id;
    const likeIndex = post.likes.findIndex(id => id.toString() === userId);
    
    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(userId);
    }

    await post.save();
    console.log(`✅ Like toggled sur post ${post._id} par user ${userId}`);
    res.json(post);
  } catch (err) {
    console.error("❌ Erreur like:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// COMMENT POST
router.post("/:id/comment", verifyToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: "Commentaire vide" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post non trouvé" });

    const userInfo = await getUserInfo(req.user.id);
    if (!userInfo) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const newComment = {
      content,
      user: userInfo
    };

    post.comments.push(newComment);
    await post.save();
    
    console.log(`✅ Commentaire ajouté sur post ${post._id}`);
    res.json(post.comments[post.comments.length - 1]);
  } catch (err) {
    console.error("❌ Erreur commentaire:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE COMMENT
router.delete("/:id/comment/:commentId", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post non trouvé" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Commentaire non trouvé" });

    if (comment.user._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Non autorisé" });
    }

    comment.deleteOne();
    await post.save();
    res.json({ message: "Commentaire supprimé", comments: post.comments });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// VIEW POST
router.post("/:id/view", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post non trouvé" });

    const userId = req.user.id;
    if (!post.views.some(id => id.toString() === userId)) {
      post.views.push(userId);
      await post.save();
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// SHARE POST
router.post("/:id/share", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post non trouvé" });

    const userId = req.user.id;
    if (!post.shares) post.shares = [];
    if (!post.shares.some(id => id.toString() === userId)) {
      post.shares.push(userId);
      await post.save();
    }

    res.json({ message: "Post partagé", shares: post.shares.length });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;