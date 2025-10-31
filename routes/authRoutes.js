// backend/routes/authRoutes.js
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
import pino from "pino";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM:ss" },
  },
});

const router = express.Router();

// ============================================
// DEBUG MIDDLEWARE - Avant chaque route
// ============================================
router.use((req, res, next) => {
  logger.info(`📍 [ROUTE] ${req.method} ${req.path}`);
  logger.info(`📦 [BODY] ${JSON.stringify(req.body)}`);
  logger.info(`🔑 [HEADERS] Authorization: ${req.headers.authorization ? "Present" : "Missing"}`);
  logger.info(`🍪 [COOKIES] token: ${req.cookies?.token ? "Present" : "Missing"}, refreshToken: ${req.cookies?.refreshToken ? "Present" : "Missing"}`);
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
  logger.warn("═══════════════════════════════════════════════════");
  logger.warn("🚀 [REGISTER ROUTE] Request intercepted");
  logger.warn(`📧 Email: ${req.body.email}`);
  logger.warn(`👤 FullName: ${req.body.fullName}`);
  logger.warn(`✅ Passant au middleware authLimiter...`);
  logger.warn("═══════════════════════════════════════════════════");
  next();
}, authLimiter, (req, res, next) => {
  logger.warn("✅ [REGISTER] Après authLimiter, avant authController.register");
  next();
}, register);

/**
 * POST /api/auth/login
 * Connexion d'un utilisateur
 * Body: { email, password }
 */
router.post("/login", (req, res, next) => {
  logger.info("═══════════════════════════════════════════════════");
  logger.info("🔐 [LOGIN ROUTE] Request intercepted");
  logger.info(`📧 Email: ${req.body.email}`);
  logger.info("═══════════════════════════════════════════════════");
  next();
}, authLimiter, (req, res, next) => {
  logger.info("✅ [LOGIN] Après authLimiter, avant authController.login");
  next();
}, login);

/**
 * POST /api/auth/refresh-token
 * Rafraîchir le token d'accès
 * Cookies: refreshToken
 */
router.post("/refresh-token", (req, res, next) => {
  logger.info("═══════════════════════════════════════════════════");
  logger.info("🔄 [REFRESH-TOKEN] Request intercepted");
  logger.info(`🍪 refreshToken present: ${req.cookies?.refreshToken ? "YES" : "NO"}`);
  logger.info("═══════════════════════════════════════════════════");
  next();
}, refreshToken);

/**
 * POST /api/auth/refresh (alias pour compatibilité)
 */
router.post("/refresh", (req, res, next) => {
  logger.info("🔄 [REFRESH-ALIAS] Redirigé vers /refresh-token");
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
  logger.info("═══════════════════════════════════════════════════");
  logger.info("✅ [VERIFY] Request intercepted");
  logger.info(`🔑 Token present: ${req.headers.authorization ? "YES" : "NO"}`);
  logger.info("═══════════════════════════════════════════════════");
  next();
}, verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    
    if (!user) {
      logger.warn(`⚠️ [VERIFY] Utilisateur introuvable: ${req.user.id}`);
      return res.status(404).json({
        valid: false,
        message: "Utilisateur introuvable",
      });
    }
    
    logger.info(`✅ [VERIFY] Token valide pour: ${user.email}`);
    
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
    logger.error("❌ [VERIFY] Erreur:", err);
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
  logger.info("═══════════════════════════════════════════════════");
  logger.info("👤 [ME ROUTE] Request intercepted");
  logger.info(`🔑 Token present: ${req.headers.authorization ? "YES" : "NO"}`);
  logger.info("═══════════════════════════════════════════════════");
  next();
}, verifyToken, (req, res, next) => {
  logger.info("✅ [ME] Après verifyToken, req.user:", req.user);
  next();
}, getCurrentUser);

/**
 * POST /api/auth/logout
 * Déconnexion (clear cookies)
 */
router.post("/logout", (req, res, next) => {
  logger.info("🔒 [LOGOUT] Request intercepted");
  next();
}, logout);

// ============================================
// ERROR HANDLER
// ============================================
router.use((err, req, res, next) => {
  logger.error("❌ [ROUTE ERROR]", err);
  res.status(500).json({ message: "Route error", error: err.message });
});

export default router;