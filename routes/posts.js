// backend/routes/postsRoutes.js - VERSION CORRIGÉE URLS CLOUDINARY
import express from "express";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";
import multer from "multer";
import { uploadFile, deleteFile } from "../utils/cloudinaryServer.js";

const router = express.Router();

// Configuration Multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
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
// Helper: Récupérer les infos utilisateur
// ============================================
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
// CREATE POST - ✅ CORRECTION URLS CLOUDINARY
// ============================================
router.post("/", verifyToken, upload.array("media"), async (req, res) => {
  try {
    const { content, location, privacy } = req.body;
    
    if (!content?.trim() && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ 
        success: false, 
        message: "Le post doit contenir du texte ou des médias" 
      });
    }

    const userInfo = await getUserInfo(req.user.id);
    if (!userInfo) {
      return res.status(404).json({ 
        success: false, 
        message: "Utilisateur introuvable" 
      });
    }

    // ✅ CORRECTION CRITIQUE: Stocker les URLs complètes, pas les public_ids
    const mediaUrls = [];
    const mediaPublicIds = []; // Garder pour la suppression ultérieure
    let mediaType = null;
    
    if (req.files?.length > 0) {
      console.log(`📤 Upload de ${req.files.length} fichier(s) vers Cloudinary...`);
      
      for (const file of req.files) {
        try {
          const isVideo = file.mimetype.startsWith('video/');
          
          // ✅ Upload vers Cloudinary
          const result = await uploadFile(
            file.buffer, 
            "posts",
            file.originalname,
            isVideo ? 'video' : 'image'
          );
          
          console.log(`✅ Cloudinary upload success:`, {
            public_id: result.public_id,
            secure_url: result.secure_url,
            format: result.format,
            resource_type: result.resource_type
          });
          
          // ✅ CORRECTION: Stocker l'URL complète pour l'affichage
          mediaUrls.push(result.secure_url);
          
          // ✅ IMPORTANT: Garder le public_id AVEC extension pour la suppression
          // Cloudinary retourne le public_id sans extension, mais on peut la récupérer du secure_url
          const publicIdWithExtension = result.public_id + '.' + result.format;
          mediaPublicIds.push(publicIdWithExtension);
          
          if (!mediaType) {
            mediaType = isVideo ? 'video' : 'image';
          }
        } catch (uploadErr) {
          console.error("❌ Erreur upload Cloudinary:", uploadErr);
          
          // Rollback: supprimer les fichiers déjà uploadés
          for (const uploadedId of mediaPublicIds) {
            try {
              await deleteFile(uploadedId);
            } catch {}
          }
          
          return res.status(500).json({
            success: false,
            message: "Erreur lors de l'upload des médias",
            error: uploadErr.message
          });
        }
      }
    }

    console.log('💾 URLs stockées en BDD:', mediaUrls);
    console.log('🔑 Public IDs (pour suppression):', mediaPublicIds);

    // ✅ Créer le post avec les URLs complètes
    const newPost = new Post({
      user: userInfo,
      content: content?.trim() || "",
      media: mediaUrls, // ✅ URLs complètes exploitables par le frontend
      mediaPublicIds: mediaPublicIds, // Stocker séparément pour la suppression
      mediaType,
      location: location || null,
      privacy: privacy || "Public",
      likes: [],
      views: [],
      comments: [],
      shares: [],
    });

    await newPost.save();

    console.log("✅ Post créé:", {
      _id: newPost._id,
      mediaCount: mediaUrls.length,
      mediaUrls: mediaUrls
    });

    res.status(201).json({ 
      success: true, 
      data: newPost.toObject()
    });

  } catch (err) {
    console.error("❌ Erreur création post:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur", 
      error: err.message 
    });
  }
});

// ============================================
// GET POSTS (DEBUG VERSION)
// ============================================
router.get("/", verifyToken, async (req, res) => {
  try {
    console.log("🛰️ [DEBUG] GET /posts appelé");
    let { userId, page = 1, limit = 20 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    console.log("🔍 [DEBUG] Query params:", { userId, page, limit });

    let query = {};
    if (userId) query = { "user._id": userId };

    const totalPosts = await Post.countDocuments(query);
    console.log(`📊 [DEBUG] Total posts trouvés: ${totalPosts}`);

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    console.log(`📦 [DEBUG] ${posts.length} posts récupérés depuis MongoDB`);

    // Enrichir chaque post
    const enrichedPosts = await Promise.all(posts.map(async (post, index) => {
      console.log(`\n🧩 [DEBUG] Traitement post ${index + 1}/${posts.length}`);
      console.log(`   🆔 ID: ${post._id}`);
      console.log(`   📅 Créé le: ${post.createdAt}`);
      console.log(`   📄 Contenu:`, post.content?.slice(0, 60) || "(vide)");

      const uid = post.user?._id || post.user;
      console.log(`   👤 User ID: ${uid}`);

      const info = await getUserInfo(uid);
      if (info) {
        post.user = info;
        console.log(`   ✅ User enrichi: ${info.username || info.fullName}`);
      } else {
        console.warn(`   ⚠️ Aucun user trouvé pour ${uid}`);
      }

      if (Array.isArray(post.media) && post.media.length > 0) {
        console.log(`   🎞️ Médias trouvés: ${post.media.length}`);
        post.media.forEach((m, i) => {
          console.log(`      [${i}] ${m}`);
          // Vérifier si c'est une URL valide
          if (!m.startsWith('http')) {
            console.warn(`      ⚠️ URL invalide détectée: ${m}`);
          }
        });
      } else {
        console.log("   🚫 Aucun média associé");
      }

      return post;
    }));

    console.log(`\n✅ [DEBUG] ${enrichedPosts.length} posts prêts à l'envoi`);
    
    res.json({ 
      success: true, 
      data: enrichedPosts,
      posts: enrichedPosts,
      hasMore: page * limit < totalPosts,
      total: totalPosts,
      page,
      limit
    });

  } catch (err) {
    console.error("❌ [DEBUG] Erreur récupération posts:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur", 
      error: err.message 
    });
  }
});

// ============================================
// UPDATE POST - ✅ CORRECTION URLS
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

    if (post.user._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Non autorisé" 
      });
    }

    const { content, location, privacy } = req.body;
    
    if (content !== undefined) post.content = content;
    if (location !== undefined) post.location = location;
    if (privacy) post.privacy = privacy;

    // ✅ Upload nouveaux médias
    if (req.files?.length > 0) {
      console.log(`📤 Upload de ${req.files.length} nouveau(x) média(s)...`);
      
      // Supprimer les anciens médias de Cloudinary
      if (post.mediaPublicIds?.length > 0) {
        for (const oldPublicId of post.mediaPublicIds) {
          try {
            await deleteFile(oldPublicId);
            console.log(`🗑️ Ancien média supprimé: ${oldPublicId}`);
          } catch (delErr) {
            console.warn("⚠️ Erreur suppression:", delErr);
          }
        }
      }

      const newMediaUrls = [];
      const newMediaPublicIds = [];
      let newMediaType = null;
      
      for (const file of req.files) {
        try {
          const isVideo = file.mimetype.startsWith('video/');
          
          const result = await uploadFile(
            file.buffer, 
            "posts", 
            file.originalname,
            isVideo ? 'video' : 'image'
          );
          
          // ✅ Stocker URL et public_id
          newMediaUrls.push(result.secure_url);
          newMediaPublicIds.push(result.public_id);
          
          if (!newMediaType) {
            newMediaType = isVideo ? 'video' : 'image';
          }
        } catch (uploadErr) {
          console.error("❌ Erreur upload:", uploadErr);
        }
      }

      post.media = newMediaUrls;
      post.mediaPublicIds = newMediaPublicIds;
      post.mediaType = newMediaType;
    }

    await post.save();
    
    console.log("✅ Post modifié:", post._id);
    res.json({ success: true, data: post.toObject() });

  } catch (err) {
    console.error("❌ Erreur modification post:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur", 
      error: err.message 
    });
  }
});

// ============================================
// DELETE POST - ✅ UTILISE mediaPublicIds
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

    if (post.user._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Non autorisé" 
      });
    }

    // ✅ Supprimer les médias Cloudinary en utilisant mediaPublicIds
    if (post.mediaPublicIds?.length > 0) {
      console.log(`🗑️ Suppression de ${post.mediaPublicIds.length} média(s) Cloudinary...`);
      for (const publicId of post.mediaPublicIds) {
        try {
          await deleteFile(publicId);
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
      error: err.message 
    });
  }
});

// ============================================
// 🔀 POST /api/posts/:id/share - PARTAGER UN POST
// ============================================
router.post("/:id/share", verifyToken, async (req, res) => {
  try {
    const { recipients, message } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucun destinataire sélectionné"
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post introuvable"
      });
    }

    const sender = await User.findById(req.user.id).select(
      "_id username fullName profilePhoto isVerified isPremium"
    );

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable"
      });
    }

    // ✅ Ajouter l'utilisateur actuel aux shares du post
    if (!post.shares.includes(req.user.id)) {
      post.shares.push(req.user.id);
    }

    await post.save();

    // ✅ Créer des notifications pour chaque destinataire
    const notificationPromises = recipients.map(async (recipientId) => {
      try {
        const recipient = await User.findById(recipientId);
        if (!recipient) return;

        const notification = {
          type: "share",
          sender: {
            _id: sender._id,
            fullName: sender.fullName || sender.username,
            profilePhoto: sender.profilePhoto,
            isVerified: sender.isVerified,
          },
          post: {
            _id: post._id,
            content: post.content?.substring(0, 50) || "",
            media: post.media?.[0] || null,
          },
          message: message || "",
          createdAt: new Date(),
          read: false,
        };

        if (!recipient.notifications) {
          recipient.notifications = [];
        }

        recipient.notifications.push(notification);
        
        // Limiter à 100 notifications
        if (recipient.notifications.length > 100) {
          recipient.notifications = recipient.notifications.slice(-100);
        }

        await recipient.save();
        console.log(`✅ Notification envoyée à: ${recipient.email}`);
      } catch (err) {
        console.error(`❌ Erreur notification pour ${recipientId}:`, err);
      }
    });

    await Promise.all(notificationPromises);

    console.log(`🔀 Post ${post._id} partagé avec ${recipients.length} personne(s) par ${sender.email}`);

    res.json({
      success: true,
      message: `Post partagé avec ${recipients.length} personne${recipients.length > 1 ? 's' : ''}`,
      data: {
        ...post.toObject(),
        shares: post.shares
      }
    });

  } catch (err) {
    console.error("❌ Erreur partage post:", err);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: err.message
    });
  }
});
// ============================================
// AUTRES ROUTES (like, comment, etc.)
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
      error: err.message 
    });
  }
});

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
      message: "Erreur serveur",
      error: err.message 
    });
  }
});

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

    const user = await User.findById(req.user.id).select(
      "_id username fullName profilePhoto isVerified isPremium role"
    );
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Utilisateur introuvable" 
      });
    }

    const newComment = { 
      content: content.trim(), 
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName || user.username,
        profilePhoto: user.profilePhoto,
        isVerified: user.isVerified || false,
        isPremium: user.isPremium || false,
      },
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
      message: "Erreur serveur",
      error: err.message 
    });
  }
});

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
      message: "Erreur serveur",
      error: err.message 
    });
  }
});

export default router;
