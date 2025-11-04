// backend/routes/authRoutes.js - VERSION PRODUCTION READY
import express from "express";
import {
  register,
  login,
  logout,
  refreshToken,
  getCurrentUser,
  authLimiter,
} from "../controllers/authController.js";
import { verifyToken } from "../middleware/auth.js";
import User from "../models/User.js";
import logger from "../config/moduleLogger.js"; // Import du logger centralisé

const router = express.Router();

// ============================================
// DEBUG MIDDLEWARE - Avant chaque route
// ============================================
router.use((req, res, next) => {
  moduleLogger.info({
    method: req.method,
    path: req.path,
    body: req.body,
    hasAuth: !!req.headers.authorization,
    hasTokenCookie: !!req.cookies?.token,
    hasRefreshCookie: !!req.cookies?.refreshToken,
  }, `📍 ${req.method} ${req.path}`);
  next();
});

// ============================================
// 📝 Routes publiques (avec rate limiting)
// ============================================

/**
 * POST /api/auth/register
 * Inscription d'un nouvel utilisateur
 * Body: { fullName, email, confirmEmail, password }
 */
router.post("/register", (req, res, next) => {
  moduleLogger.info({
    email: req.body.email,
    fullName: req.body.fullName,
  }, "🚀 REGISTER - Début du processus d'inscription");
  next();
}, authLimiter, (req, res, next) => {
  moduleLogger.debug("✅ REGISTER - Après authLimiter");
  next();
}, register);

/**
 * POST /api/auth/login
 * Connexion d'un utilisateur
 * Body: { email, password }
 */
router.post("/login", (req, res, next) => {
  moduleLogger.info({
    email: req.body.email,
  }, "🔐 LOGIN - Tentative de connexion");
  next();
}, authLimiter, (req, res, next) => {
  moduleLogger.debug("✅ LOGIN - Après authLimiter");
  next();
}, login);

/**
 * POST /api/auth/refresh-token
 * Rafraîchir le token d'accès
 * Cookies: refreshToken
 */
router.post("/refresh-token", (req, res, next) => {
  moduleLogger.info({
    hasRefreshToken: !!req.cookies?.refreshToken,
  }, "🔄 REFRESH-TOKEN - Demande de rafraîchissement");
  next();
}, refreshToken);

/**
 * POST /api/auth/refresh (alias pour compatibilité)
 */
router.post("/refresh", (req, res, next) => {
  moduleLogger.debug("🔄 REFRESH - Alias redirigé vers /refresh-token");
  next();
}, refreshToken);

// ============================================
// 🔐 Routes protégées (authentification requise)
// ============================================

/**
 * GET /api/auth/verify
 * Vérifier la validité du token
 */
router.get("/verify", (req, res, next) => {
  moduleLogger.info({
    hasAuth: !!req.headers.authorization,
    hasCookie: !!req.cookies?.token,
  }, "✅ VERIFY - Vérification du token");
  next();
}, verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    
    if (!user) {
      moduleLogger.warn({
        userId: req.user.id,
      }, "⚠️ VERIFY - Utilisateur introuvable");
      
      return res.status(404).json({
        valid: false,
        message: "Utilisateur introuvable",
      });
    }
    
    moduleLogger.info({
      userId: user._id,
      email: user.email,
    }, "✅ VERIFY - Token valide");
    
    res.status(200).json({
      valid: true,
      user: {
        id: user._id,
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        hasSeenPhoneModal: user.hasSeenPhoneModal,
        role: user.role,
        isVerified: user.isVerified,
        isPremium: user.isPremium,
        profilePhoto: user.profilePhoto || "/default-avatar.png",
        coverPhoto: user.coverPhoto,
        bio: user.bio,
        location: user.location,
        website: user.website,
      },
    });
  } catch (err) {
    moduleLogger.error({
      err,
      userId: req.user?.id,
    }, "❌ VERIFY - Erreur lors de la vérification");
    
    res.status(401).json({
      valid: false,
      message: "Token invalide",
    });
  }
});

/**
 * GET /api/auth/me
 * Récupérer les infos de l'utilisateur connecté
 */
router.get("/me", (req, res, next) => {
  moduleLogger.info({
    hasAuth: !!req.headers.authorization,
  }, "👤 ME - Récupération des infos utilisateur");
  next();
}, verifyToken, (req, res, next) => {
  moduleLogger.debug({
    userId: req.user?.id,
    email: req.user?.email,
  }, "✅ ME - Après verifyToken");
  next();
}, getCurrentUser);

/**
 * POST /api/auth/logout
 * Déconnexion (clear cookies)
 */
router.post("/logout", (req, res, next) => {
  moduleLogger.info("🔒 LOGOUT - Déconnexion utilisateur");
  next();
}, logout);

// ============================================
// ERROR HANDLER
// ============================================
router.use((err, req, res, next) => {
  moduleLogger.error({
    err,
    method: req.method,
    path: req.path,
  }, "❌ ROUTE ERROR - Erreur dans authRoutes");
  
  res.status(err.status || 500).json({ 
    message: err.message || "Erreur serveur", 
    error: process.env.NODE_ENV === "development" ? err.message : undefined 
  });
});

export default router;
