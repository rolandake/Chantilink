// backend/routes/userRoutes.js - VERSION OPTIMISÉE FINALE

// backend/routes/userRoutes.js - VERSION CLOUDINARY
import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import User from "../models/User.js";
import { verifyToken, verifyTokenAdmin } from "../middleware/auth.js";
import { uploadFile, deleteFile } from "../utils/cloudinaryServer.js";
import pino from "pino";

const router = express.Router();

// ============================================
// 📋 LOGGER
// ============================================
const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM:ss" },
  },
}).child({ module: "userRoutes" });

// ============================================
// 📂 CONFIGURATION MULTER (Memory Storage pour Cloudinary)
// ============================================
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Formats autorisés : JPEG, JPG, PNG, WEBP"));
    }
    cb(null, true);
  },
}).fields([
  { name: "profilePhoto", maxCount: 1 },
  { name: "coverPhoto", maxCount: 1 },
]);

// ============================================
// 🔧 Helper pour extraire le publicId depuis une URL Cloudinary
// ============================================
const extractPublicId = (url) => {
  if (!url) return null;
  
  // Si c'est déjà un publicId (users/xxx ou covers/xxx)
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
// 📋 GET /api/users - LISTE UTILISATEURS
// ============================================
router.get("/", verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "", role = "" } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    
    if (role && ["user", "admin", "moderator"].includes(role)) {
      query.role = role;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .select("-password")
      .populate("followers", "fullName profilePhoto")
      .populate("following", "fullName profilePhoto")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await User.countDocuments(query);

    logger.info(`👥 ${users.length} utilisateurs récupérés (page ${page}/${Math.ceil(total / limit)})`);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error("❌ Erreur GET /api/users:", err);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ============================================
// 🔍 GET /api/users/search - RECHERCHE
// ============================================
router.get("/search", verifyToken, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Requête de recherche trop courte (≥2 caractères)",
      });
    }

    const users = await User.find({
      $or: [
        { fullName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    })
      .select("fullName email profilePhoto bio role isVerified")
      .limit(20)
      .lean();

    logger.info(`🔍 Recherche "${q}": ${users.length} résultats`);

    res.status(200).json({
      success: true,
      users,
      count: users.length,
    });
  } catch (err) {
    logger.error("❌ Erreur search users:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ============================================
// 👥 GET /api/users/friends - LISTE D'AMIS
// ============================================
router.get("/friends", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("friends", "fullName email profilePhoto isOnline lastSeen")
      .select("friends");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    res.status(200).json({
      success: true,
      friends: user.friends || [],
    });
  } catch (err) {
    logger.error("❌ Erreur GET /friends:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ============================================
// 📩 GET /api/users/friend-requests - DEMANDES
// ============================================
router.get("/friend-requests", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("friendRequests", "fullName email profilePhoto")
      .select("friendRequests");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    res.status(200).json({
      success: true,
      friendRequests: user.friendRequests || [],
    });
  } catch (err) {
    logger.error("❌ Erreur GET friend-requests:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ============================================
// 📱 PUT /api/users/update-phone
// ============================================
router.put("/update-phone", verifyToken, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Numéro de téléphone requis",
      });
    }

    const normalizedPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    const phoneRegex = /^\+[1-9][0-9]{6,14}$/;
    
    if (!phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Format invalide. Utilisez le format international +[indicatif][numéro]",
      });
    }

    const existingUser = await User.findOne({ 
      phone: normalizedPhone,
      _id: { $ne: req.user.id }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Ce numéro est déjà utilisé par un autre compte",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        phone: normalizedPhone,
        phoneVerified: false,
        hasSeenPhoneModal: true
      },
      { 
        new: true,
        runValidators: true 
      }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    logger.info(`📱 Numéro ajouté: ${normalizedPhone} pour ${updatedUser.email}`);

    res.status(200).json({
      success: true,
      message: "Numéro enregistré avec succès",
      user: updatedUser,
    });
  } catch (err) {
    logger.error("❌ Erreur PUT /update-phone:", err);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ============================================
// ✅ POST /api/users/seen-phone-modal
// ============================================
router.post("/seen-phone-modal", verifyToken, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { hasSeenPhoneModal: true },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    logger.info(`✅ Modal téléphone marqué comme vu pour ${updatedUser.email}`);

    res.status(200).json({
      success: true,
      message: "Modal marqué comme vu",
      user: updatedUser,
    });
  } catch (err) {
    logger.error("❌ Erreur seen-phone-modal:", err);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ============================================
// 📱 DELETE /api/users/remove-phone
// ============================================
router.delete("/remove-phone", verifyToken, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        $unset: { phone: "", phoneVerified: "" }
      },
      { new: true }
    ).select("-password");

    logger.info(`📱 Numéro supprimé pour ${updatedUser.email}`);

    res.status(200).json({
      success: true,
      message: "Numéro de téléphone supprimé",
      user: updatedUser,
    });
  } catch (err) {
    logger.error("❌ Erreur remove-phone:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ============================================
// 📱 GET /api/users/check-phone/:phone
// ============================================
router.get("/check-phone/:phone", verifyToken, async (req, res) => {
  try {
    const { phone } = req.params;
    const normalizedPhone = phone.replace(/[\s\-\(\)\.]/g, '');

    const user = await User.findOne({ phone: normalizedPhone })
      .select("fullName profilePhoto phone isVerified")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Aucun utilisateur trouvé avec ce numéro",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    logger.error("❌ Erreur check-phone:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ============================================
// 👤 GET /api/users/:userId - PROFIL UTILISATEUR
// ============================================
router.get("/:userId", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    const user = await User.findById(req.params.userId)
      .select("-password")
      .populate("followers", "fullName profilePhoto")
      .populate("following", "fullName profilePhoto")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    res.status(200).json({ success: true, user });
  } catch (err) {
    logger.error("❌ Erreur GET user by ID:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ============================================
// ✏️ PUT /api/users/:userId - MISE À JOUR PROFIL
// ============================================
router.put("/:userId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const paramUserId = req.params.userId;

    if (userId !== paramUserId) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé : vous ne pouvez modifier que votre propre profil",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    const updateData = {};
    const { fullName, email, bio, pageContent, location, website, profilePhoto, coverPhoto } = req.body;

    if (fullName !== undefined) updateData.fullName = fullName.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (pageContent !== undefined) updateData.pageContent = pageContent.trim();
    if (location !== undefined) updateData.location = location.trim();
    if (website !== undefined) updateData.website = website.trim();
    
    // ✅ Accepter les URLs Cloudinary
    if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto;
    if (coverPhoto !== undefined) updateData.coverPhoto = coverPhoto;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucune modification détectée",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    })
      .select("-password")
      .lean();

    logger.info(`✏️ Profil mis à jour: ${updatedUser.email}`);

    res.status(200).json({
      success: true,
      message: "Profil mis à jour avec succès",
      user: updatedUser,
    });
  } catch (err) {
    logger.error("❌ Erreur PUT /api/users/:userId:", err);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ============================================
// 📸 PUT /api/users/:userId/images - UPLOAD IMAGES CLOUDINARY
// ============================================
router.put("/:userId/images", verifyToken, (req, res) => {
  upload(req, res, async (err) => {
    // Gestion erreur Multer
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          message: "Fichier trop volumineux (5 Mo max)" 
        });
      }
      return res.status(400).json({ 
        success: false, 
        message: `Erreur upload: ${err.message}` 
      });
    }
    
    if (err) {
      logger.error("❌ Erreur multer:", err);
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      const userId = req.user.id;
      const paramUserId = req.params.userId;

      if (userId !== paramUserId) {
        return res.status(403).json({
          success: false,
          message: "Accès refusé",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "ID utilisateur invalide",
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Utilisateur introuvable",
        });
      }

      const updateData = {};

      // ✅ Upload photo de profil sur Cloudinary
      if (req.files?.profilePhoto?.[0]) {
        const file = req.files.profilePhoto[0];
        
        // Supprimer ancienne photo sur Cloudinary
        if (user.profilePhoto) {
          const oldPublicId = extractPublicId(user.profilePhoto);
          if (oldPublicId) {
            try {
              await deleteFile(oldPublicId);
              logger.info(`🗑️ Ancienne photo profil supprimée: ${oldPublicId}`);
            } catch (delErr) {
              logger.warn("⚠️ Erreur suppression ancienne photo profil:", delErr);
            }
          }
        }

        // Upload vers Cloudinary
        const result = await uploadFile(
          file.buffer,
          "users",
          file.originalname,
          "image"
        );

        updateData.profilePhoto = result.secure_url;
        logger.info(`📸 Nouvelle photo de profil : ${updateData.profilePhoto}`);
      }

      // ✅ Upload photo de couverture sur Cloudinary
      if (req.files?.coverPhoto?.[0]) {
        const file = req.files.coverPhoto[0];
        
        // Supprimer ancienne photo sur Cloudinary
        if (user.coverPhoto) {
          const oldPublicId = extractPublicId(user.coverPhoto);
          if (oldPublicId) {
            try {
              await deleteFile(oldPublicId);
              logger.info(`🗑️ Ancienne photo couverture supprimée: ${oldPublicId}`);
            } catch (delErr) {
              logger.warn("⚠️ Erreur suppression ancienne photo couverture:", delErr);
            }
          }
        }

        // Upload vers Cloudinary
        const result = await uploadFile(
          file.buffer,
          "covers",
          file.originalname,
          "image"
        );

        updateData.coverPhoto = result.secure_url;
        logger.info(`📸 Nouvelle photo de couverture : ${updateData.coverPhoto}`);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Aucune image détectée",
        });
      }

      const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      })
        .select("-password")
        .lean();

      logger.info(`✅ Images mises à jour: ${updatedUser.email}`);

      res.status(200).json({
        success: true,
        message: "Images mises à jour avec succès",
        user: updatedUser,
      });
    } catch (err) {
      logger.error("❌ Erreur PUT /api/users/:userId/images:", err);
      res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  });
});

// ============================================
// ➕ POST /api/users/:userId/follow
// ============================================
router.post("/:userId/follow", verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    if (currentUserId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas vous suivre vous-même",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { following: targetUserId },
    });
    await User.findByIdAndUpdate(targetUserId, {
      $addToSet: { followers: currentUserId },
    });

    logger.info(`➕ ${req.user.email} suit ${targetUser.email}`);

    res.status(200).json({
      success: true,
      message: "Abonnement réussi",
      targetUser: {
        id: targetUser._id,
        fullName: targetUser.fullName,
        profilePhoto: targetUser.profilePhoto,
      },
    });
  } catch (err) {
    logger.error("❌ Erreur follow:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ============================================
// ➖ POST /api/users/:userId/unfollow
// ============================================
router.post("/:userId/unfollow", verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    if (currentUserId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Action invalide",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { following: targetUserId },
    });
    await User.findByIdAndUpdate(targetUserId, {
      $pull: { followers: currentUserId },
    });

    logger.info(`➖ ${req.user.email} ne suit plus ${targetUser.email}`);

    res.status(200).json({
      success: true,
      message: "Désabonnement réussi",
      targetUser: {
        id: targetUser._id,
        fullName: targetUser.fullName,
        profilePhoto: targetUser.profilePhoto,
      },
    });
  } catch (err) {
    logger.error("❌ Erreur unfollow:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});
// ============================================
// 🔔 GET /api/users/:id/notifications - NOTIFICATIONS
// ============================================
router.get('/:id/notifications', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id !== id) {
      return res.status(403).json({ 
        message: 'Action non autorisée' 
      });
    }

    const user = await User.findById(id).select('notifications');
    
    if (!user) {
      return res.status(404).json({ 
        message: 'Utilisateur introuvable' 
      });
    }

    const sortedNotifications = (user.notifications || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({ 
      success: true,
      notifications: sortedNotifications,
      unreadCount: sortedNotifications.filter(n => !n.read).length
    });

  } catch (error) {
    logger.error('❌ Erreur récupération notifications:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
});

// ============================================
// 🔔 PATCH /api/users/:id/notifications/read-all
// ============================================
router.patch('/:id/notifications/read-all', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id !== id) {
      return res.status(403).json({ 
        message: 'Action non autorisée' 
      });
    }

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'Utilisateur introuvable' 
      });
    }

    if (user.notifications && user.notifications.length > 0) {
      user.notifications.forEach(notif => {
        notif.read = true;
      });
      
      await user.save();
      
      logger.info(`✅ ${user.notifications.length} notifications marquées comme lues pour ${user.email}`);
    }

    res.json({ 
      success: true,
      message: 'Toutes les notifications ont été marquées comme lues',
      notifications: user.notifications
    });

  } catch (error) {
    logger.error('❌ Erreur marquage notifications:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
});

// ============================================
// 🔔 DELETE /api/users/:id/notifications/:notificationId
// ============================================
router.delete('/:id/notifications/:notificationId', verifyToken, async (req, res) => {
  try {
    const { id, notificationId } = req.params;

    if (req.user.id !== id) {
      return res.status(403).json({ 
        message: 'Action non autorisée' 
      });
    }

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'Utilisateur introuvable' 
      });
    }

    const initialLength = user.notifications?.length || 0;
    
    user.notifications = user.notifications.filter(
      notif => notif._id.toString() !== notificationId
    );
    
    const deleted = initialLength > user.notifications.length;
    
    if (!deleted) {
      return res.status(404).json({ 
        message: 'Notification introuvable' 
      });
    }

    await user.save();
    
    logger.info(`✅ Notification ${notificationId} supprimée pour ${user.email}`);

    res.json({ 
      success: true,
      message: 'Notification supprimée avec succès',
      notifications: user.notifications
    });

  } catch (error) {
    logger.error('❌ Erreur suppression notification:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
});

// ============================================
// 👥 POST /api/users/friend-request/:userId - DEMANDE AMI
// ============================================
router.post("/friend-request/:userId", verifyToken, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { userId: recipientId } = req.params;

    if (senderId === recipientId) {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas vous ajouter vous-même",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);

    if (!sender || !recipient) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    if (sender.friends?.includes(recipientId)) {
      return res.status(400).json({
        success: false,
        message: "Vous êtes déjà amis",
      });
    }

    if (recipient.friendRequests?.includes(senderId)) {
      return res.status(400).json({
        success: false,
        message: "Demande déjà envoyée",
      });
    }

    if (!recipient.friendRequests) recipient.friendRequests = [];
    recipient.friendRequests.push(senderId);
    await recipient.save();

    logger.info(`➕ Demande d'ami: ${sender.email} → ${recipient.email}`);

    res.status(200).json({
      success: true,
      message: "Demande d'ami envoyée",
    });
  } catch (err) {
    logger.error("❌ Erreur friend-request:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ============================================
// ✅ POST /api/users/friend-request/:userId/accept
// ============================================
router.post("/friend-request/:userId/accept", verifyToken, async (req, res) => {
  try {
    const recipientId = req.user.id;
    const { userId: senderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    const recipient = await User.findById(recipientId);
    const sender = await User.findById(senderId);

    if (!recipient || !sender) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    if (!recipient.friendRequests?.some(id => id.toString() === senderId)) {
      return res.status(400).json({
        success: false,
        message: "Demande introuvable",
      });
    }

    if (!recipient.friends) recipient.friends = [];
    if (!sender.friends) sender.friends = [];

    if (!recipient.friends.some(id => id.toString() === senderId)) {
      recipient.friends.push(senderId);
    }
    if (!sender.friends.some(id => id.toString() === recipientId)) {
      sender.friends.push(recipientId);
    }

    recipient.friendRequests = recipient.friendRequests.filter(
      id => id.toString() !== senderId
    );

    await recipient.save();
    await sender.save();

    logger.info(`✅ Amitié acceptée: ${sender.email} ↔ ${recipient.email}`);

    res.status(200).json({
      success: true,
      message: "Demande acceptée",
    });
  } catch (err) {
    logger.error("❌ Erreur accept friend:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ============================================
// ❌ POST /api/users/friend-request/:userId/decline
// ============================================
router.post("/friend-request/:userId/decline", verifyToken, async (req, res) => {
  try {
    const recipientId = req.user.id;
    const { userId: senderId } = req.params;

    const recipient = await User.findById(recipientId);

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    recipient.friendRequests = recipient.friendRequests?.filter(
      id => id.toString() !== senderId
    ) || [];

    await recipient.save();

    logger.info(`❌ Demande refusée: ${senderId} → ${recipientId}`);

    res.status(200).json({
      success: true,
      message: "Demande refusée",
    });
  } catch (err) {
    logger.error("❌ Erreur decline friend:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ============================================
// 🗑️ DELETE /api/users/friends/:userId - RETIRER AMI
// ============================================
router.delete("/friends/:userId", verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId: friendId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    const currentUser = await User.findById(currentUserId);
    const friend = await User.findById(friendId);

    if (!currentUser || !friend) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    currentUser.friends = currentUser.friends?.filter(
      id => id.toString() !== friendId
    ) || [];
    friend.friends = friend.friends?.filter(
      id => id.toString() !== currentUserId
    ) || [];

    await currentUser.save();
    await friend.save();

    logger.info(`➖ Amitié retirée: ${currentUser.email} ↔ ${friend.email}`);

    res.status(200).json({
      success: true,
      message: "Ami retiré",
    });
  } catch (err) {
    logger.error("❌ Erreur DELETE friend:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ============================================
// 🗑️ DELETE /api/users/:userId - SUPPRIMER UTILISATEUR (ADMIN)
// ============================================
router.delete("/:userId", verifyTokenAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(403).json({
          success: false,
          message: "Impossible de supprimer le dernier administrateur",
        });
      }
    }

    await User.findByIdAndDelete(userId);

    logger.warn(`🗑️ Utilisateur supprimé: ${user.email} par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: "Utilisateur supprimé avec succès",
    });
  } catch (err) {
    logger.error("❌ Erreur DELETE user:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;