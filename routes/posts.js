// backend/routes/postsRoutes.js - VERSION CORRIGÉE
import express from "express";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";
import multer from "multer";
import { uploadFile, deleteFile } from "../utils/cloudinaryServer.js";

const router = express.Router();

// --- Multer in-memory ---
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// --- Helpers ---
const getUserInfo = async (userId) => {
  try {
    const user = await User.findById(userId).select(
      "_id username fullName profilePhoto isVerified isPremium role"
    );
    if (!user) return null;
    return {
      _id: user._id,
      username: user.username,
      fullName: user.fullName || user.username,
      profilePhoto: user.profilePhoto,
      isVerified: user.isVerified || false,
      isPremium: user.isPremium || false,
      role: user.role || "user",
    };
  } catch (err) {
    console.error("❌ getUserInfo error:", err);
    return null;
  }
};

// ============================================
// CREATE POST - CORRIGÉ
// ============================================
router.post("/", verifyToken, upload.array("media"), async (req, res) => {
  try {
    const { content, location, privacy } = req.body;
    
    // Validation
    if (!content?.trim() && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ 
        success: false, 
        message: "Post vide" 
      });
    }

    // Récupérer les infos utilisateur
    const userInfo = await getUserInfo(req.user.id);
    if (!userInfo) {
      return res.status(404).json({ 
        success: false, 
        message: "Utilisateur introuvable" 
      });
    }

    // ✅ CORRECTION 1: Upload vers Cloudinary et extraire les URLs
    const mediaUrls = [];
    if (req.files?.length > 0) {
      console.log(`📤 Upload de ${req.files.length} fichier(s) vers Cloudinary...`);
      
      for (const file of req.files) {
        try {
          // uploadFile retourne { secure_url, public_id, resource_type, ... }
          const result = await uploadFile(
            file.buffer, 
            "posts", 
            `${req.user.id}-${Date.now()}-${file.originalname}`
          );
          
          console.log(`✅ Fichier uploadé:`, {
            public_id: result.public_id,
            secure_url: result.secure_url,
            resource_type: result.resource_type
          });
          
          // On stocke le public_id (pas l'URL complète) pour flexibilité
          mediaUrls.push(result.public_id);
        } catch (uploadErr) {
          console.error("❌ Erreur upload Cloudinary:", uploadErr);
          // On continue avec les autres fichiers
        }
      }
    }

    // Déterminer le type de média
    const mediaType = req.files?.[0]?.mimetype.startsWith("video") ? "video" : "image";

    // ✅ CORRECTION 2: Créer le post avec les public_ids Cloudinary
    const newPost = new Post({
      user: userInfo,
      content: content || "",
      media: mediaUrls, // Array de public_ids Cloudinary
      mediaType,
      location,
      privacy: privacy || "Public",
      likes: [],
      views: [],
      comments: [],
      shares: [],
    });

    await newPost.save();

    console.log("✅ Post créé avec succès:", {
      _id: newPost._id,
      mediaCount: mediaUrls.length,
      media: mediaUrls
    });

    // ✅ CORRECTION 3: Retourner le format attendu par le frontend
    res.status(201).json({ 
      success: true, 
      data: newPost.toObject() // Convertir en objet plain
    });

  } catch (err) {
    console.error("❌ Erreur création post:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur", 
      details: err.message 
    });
  }
});

// ============================================
// UPDATE POST - CORRIGÉ
// ============================================
router.put("/:id", verifyToken, upload.array("media"), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: "Post introuvable" 
      });
    }

    // Vérification des permissions
    if (post.user._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Non autorisé" 
      });
    }

    const { content, location, privacy } = req.body;
    
    // Mise à jour des champs simples
    if (content !== undefined) post.content = content;
    if (location !== undefined) post.location = location;
    if (privacy) post.privacy = privacy;

    // ✅ Upload nouveaux médias si fournis
    if (req.files?.length > 0) {
      console.log(`📤 Upload de ${req.files.length} nouveau(x) média(s)...`);
      
      // Supprimer les anciens médias Cloudinary
      if (post.media?.length > 0) {
        for (const oldPublicId of post.media) {
          try {
            await deleteFile(oldPublicId, post.mediaType || "image");
            console.log(`🗑️ Ancien média supprimé: ${oldPublicId}`);
          } catch (delErr) {
            console.warn("⚠️ Erreur suppression:", delErr);
          }
        }
      }

      // Upload nouveaux médias
      const newMediaUrls = [];
      for (const file of req.files) {
        try {
          const result = await uploadFile(
            file.buffer, 
            "posts", 
            `${req.user.id}-${Date.now()}-${file.originalname}`
          );
          newMediaUrls.push(result.public_id);
        } catch (uploadErr) {
          console.error("❌ Erreur upload:", uploadErr);
        }
      }

      post.media = newMediaUrls;
      post.mediaType = req.files[0].mimetype.startsWith("video") ? "video" : "image";
    }

    await post.save();
    
    console.log("✅ Post modifié:", post._id);
    res.json({ success: true, data: post.toObject() });

  } catch (err) {
    console.error("❌ Erreur modification post:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur", 
      details: err.message 
    });
  }
});

// ============================================
// DELETE POST - CORRIGÉ
// ============================================
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: "Post introuvable" 
      });
    }

    // Vérification des permissions
    if (post.user._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Non autorisé" 
      });
    }

    // ✅ Supprimer les médias Cloudinary
    if (post.media?.length > 0) {
      console.log(`🗑️ Suppression de ${post.media.length} média(s) Cloudinary...`);
      for (const publicId of post.media) {
        try {
          await deleteFile(publicId, post.mediaType || "image");
          console.log(`✅ Média supprimé: ${publicId}`);
        } catch (delErr) {
          console.warn("⚠️ Erreur suppression Cloudinary:", delErr);
        }
      }
    }

    await post.deleteOne();
    
    console.log("✅ Post supprimé:", req.params.id);
    res.json({ 
      success: true, 
      message: "Post supprimé",
      deletedId: req.params.id
    });

  } catch (err) {
    console.error("❌ Erreur suppression post:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur", 
      details: err.message 
    });
  }
});

// ============================================
// GET POSTS (all / by user) - CORRIGÉ
// ============================================
router.get("/", verifyToken, async (req, res) => {
  try {
    let { userId, page = 1, limit = 20 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    let query = {};
    if (userId) query = { "user._id": userId };

    const totalPosts = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // Convertir en objets plain

    // Enrichir les posts avec les infos utilisateur
    const enrichedPosts = await Promise.all(posts.map(async (post) => {
      const uid = post.user?._id || post.user;
      const info = await getUserInfo(uid);
      if (info) post.user = info;
      return post;
    }));

    console.log(`✅ ${enrichedPosts.length} posts récupérés (page ${page})`);
    
    // ✅ CORRECTION: Retourner le format attendu
    res.json({ 
      success: true, 
      data: enrichedPosts, // TOUJOURS un tableau
      posts: enrichedPosts, // Compatibilité frontend
      hasMore: page * limit < totalPosts,
      total: totalPosts,
      page,
      limit
    });

  } catch (err) {
    console.error("❌ Erreur récupération posts:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur", 
      details: err.message 
    });
  }
});

// ============================================
// GET POST BY ID
// ============================================
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean();
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: "Post introuvable" 
      });
    }

    const uid = post.user?._id || post.user;
    const info = await getUserInfo(uid);
    if (info) post.user = info;

    res.json({ success: true, data: post });
  } catch (err) {
    console.error("❌ Erreur récupération post:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur", 
      details: err.message 
    });
  }
});

// ============================================
// LIKE POST
// ============================================
router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: "Post introuvable" 
      });
    }

    const userId = req.user.id;
    const liked = post.likes.some((id) => id.toString() === userId);
    
    if (liked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();
    
    res.json({ 
      success: true, 
      data: post.toObject(),
      likes: post.likes,
      userLiked: !liked 
    });
  } catch (err) {
    console.error("❌ Erreur like:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
});

// ============================================
// COMMENT POST
// ============================================
router.post("/:id/comment", verifyToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Commentaire vide" 
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: "Post introuvable" 
      });
    }

    const userInfo = await getUserInfo(req.user.id);
    if (!userInfo) {
      return res.status(404).json({ 
        success: false, 
        message: "Utilisateur introuvable" 
      });
    }

    const newComment = { 
      content, 
      user: userInfo, 
      createdAt: new Date() 
    };
    
    post.comments.push(newComment);
    await post.save();

    res.json({ 
      success: true, 
      data: newComment 
    });
  } catch (err) {
    console.error("❌ Erreur commentaire:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
});

// DELETE COMMENT
router.delete("/:id/comment/:commentId", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: "Post introuvable" 
      });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: "Commentaire introuvable" 
      });
    }

    if (comment.user._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Non autorisé" 
      });
    }

    comment.deleteOne();
    await post.save();
    
    res.json({ 
      success: true, 
      message: "Commentaire supprimé", 
      data: post.comments 
    });
  } catch (err) {
    console.error("❌ Erreur suppression commentaire:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
});

// ============================================
// VIEW POST
// ============================================
router.post("/:id/view", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: "Post introuvable" 
      });
    }

    const userId = req.user.id;
    if (!post.views.includes(userId)) {
      post.views.push(userId);
      await post.save();
    }

    res.json({ 
      success: true, 
      data: { 
        views: post.views.length, 
        userViewed: post.views.includes(userId) 
      } 
    });
  } catch (err) {
    console.error("❌ Erreur view:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
});

// ============================================
// SHARE POST
// ============================================
router.post("/:id/share", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: "Post introuvable" 
      });
    }

    const userId = req.user.id;
    if (!post.shares.includes(userId)) {
      post.shares.push(userId);
      await post.save();
    }

    res.json({ 
      success: true, 
      data: { shares: post.shares.length } 
    });
  } catch (err) {
    console.error("❌ Erreur share:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
});

export default router;
