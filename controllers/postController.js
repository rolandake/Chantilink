// backend/controllers/postController.js
import Post from "../models/Post.js";
import User from "../models/User.js";
import pino from "pino";

// --- LOGGER PROD ---
const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM:ss" },
  },
});

// ✅ Helper pour récupérer les infos complètes de l'utilisateur
const getUserInfo = async (userId) => {
  try {
    const user = await User.findById(userId).select('_id username fullName profilePhoto isVerified isPremium');
    if (!user) {
      logger.warn(`⚠️ Utilisateur ${userId} introuvable`);
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
    logger.error("❌ Erreur getUserInfo:", err);
    return null;
  }
};

// ===============================
// 🔹 CREATE POST (multi-fichiers)
// ===============================
export const createPost = async (req, res) => {
  try {
    const { content, location, privacy } = req.body;

    // ✅ Récupérer l'ID utilisateur depuis le token
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    // ✅ Récupérer infos utilisateur COMPLÈTES (avec certification)
    const userInfo = await getUserInfo(userId);
    if (!userInfo) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    // ✅ Gestion fichiers médias
    let media = [];
    let mediaType = null;

    if (req.files && req.files.length > 0) {
      media = req.files.map(file => {
        const relativePath = file.path.replace(/\\/g, '/').split('uploads/')[1];
        return `/uploads/${relativePath}`;
      });

      mediaType = req.files[0].mimetype.startsWith("video") ? "video" : "image";
      logger.info(`📁 Médias créés: ${media.join(', ')}`);
    }

    // ✅ Création du post AVEC les infos utilisateur complètes
    const post = new Post({
      user: userInfo, // ✅ Objet complet avec isVerified et isPremium
      content: content || "",
      media,
      mediaType,
      location: location || "",
      privacy: privacy || "Public",
      likes: [],
      comments: [],
    });

    await post.save();

    logger.info(`✅ Post créé par ${userInfo.fullName} (${userId}) - Certifié: ${userInfo.isVerified}`);

    res.status(201).json(post);

  } catch (err) {
    logger.error("❌ Erreur création post:", err);
    res.status(500).json({
      error: "Erreur création du post",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
};

// ===============================
// 🔹 GET ALL POSTS (avec pagination)
// ===============================
export const getPosts = async (req, res) => {
  try {
    let { userId, page = 1, limit = 20 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = userId ? { "user._id": userId } : {};
    const totalPosts = await Post.countDocuments(query);
    
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // ✅ Enrichir TOUS les posts avec les données utilisateur à jour
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        try {
          const userInfo = await getUserInfo(post.user._id);
          if (userInfo) {
            // Mettre à jour l'objet user avec les infos actuelles
            post.user = userInfo;
          }
          return post;
        } catch (err) {
          logger.warn("⚠️ Erreur enrichissement post:", err);
          return post;
        }
      })
    );

    logger.info(`✅ ${enrichedPosts.length} posts récupérés (page ${page})`);
    res.json({ 
      posts: enrichedPosts, 
      hasMore: page * limit < totalPosts,
      total: totalPosts 
    });
  } catch (err) {
    logger.error("❌ Erreur récupération posts:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

// ===============================
// 🔹 GET POST BY ID
// ===============================
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post non trouvé" });
    }

    // ✅ Enrichir avec données utilisateur à jour
    const userInfo = await getUserInfo(post.user._id);
    if (userInfo) {
      post.user = userInfo;
    }

    res.json(post);
  } catch (err) {
    logger.error("❌ Erreur récupération post:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// ===============================
// 🔹 UPDATE POST
// ===============================
export const updatePost = async (req, res) => {
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
      post.media = req.files.map(file => {
        const relativePath = file.path.replace(/\\/g, '/').split('uploads/')[1];
        return `/uploads/${relativePath}`;
      });
      post.mediaType = req.files[0].mimetype.startsWith("video") ? "video" : "image";
    }

    await post.save();
    logger.info(`✅ Post ${post._id} modifié`);
    res.json({ message: "Post modifié", post });
  } catch (err) {
    logger.error("❌ Erreur modification post:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

// ===============================
// 🔹 DELETE POST
// ===============================
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post non trouvé" });
    }

    if (post.user._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Non autorisé" });
    }

    await post.deleteOne();
    logger.info(`✅ Post ${req.params.id} supprimé`);
    res.json({ message: "Post supprimé" });
  } catch (err) {
    logger.error("❌ Erreur suppression post:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

// ===============================
// 🔹 LIKE POST
// ===============================
export const likePost = async (req, res) => {
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
    logger.info(`✅ Like toggled sur post ${post._id}`);
    res.json(post);
  } catch (err) {
    logger.error("❌ Erreur like:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// ===============================
// 🔹 COMMENT POST
// ===============================
export const commentPost = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: "Commentaire vide" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post non trouvé" });

    // ✅ Récupérer les infos utilisateur complètes pour le commentaire
    const userInfo = await getUserInfo(req.user.id);
    if (!userInfo) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const newComment = {
      content,
      user: userInfo // ✅ Avec isVerified et isPremium
    };

    post.comments.push(newComment);
    await post.save();
    
    logger.info(`✅ Commentaire ajouté sur post ${post._id}`);
    res.json(post.comments[post.comments.length - 1]);
  } catch (err) {
    logger.error("❌ Erreur commentaire:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// ===============================
// 🔹 DELETE COMMENT
// ===============================
export const deleteComment = async (req, res) => {
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
    logger.error("❌ Erreur suppression commentaire:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};