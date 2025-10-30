// backend/controllers/authController.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import pino from "pino";
import rateLimit from "express-rate-limit";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM:ss" },
  },
});

// ✅ Validation stricte des secrets au démarrage
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_SECRET;
const NODE_ENV = process.env.NODE_ENV || "development";

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  logger.fatal("❌ FATAL: JWT_SECRET ou JWT_REFRESH_SECRET manquant");
  process.exit(1);
}

logger.info("✅ AuthController: Secrets JWT chargés");

// --- COOKIE OPTIONS SÉCURISÉS ---
const cookieOptions = {
  httpOnly: true,
  secure: NODE_ENV === "production",
  sameSite: NODE_ENV === "production" ? "none" : "lax",
};

// --- RATE LIMITER LOGIN & REGISTER ---
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Trop de tentatives, réessayez plus tard" },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- UTILS TOKENS ---
// ✅ CHANGEMENT ICI: 7 jours au lieu de 15 minutes
const generateToken = (user) => {
  if (!user._id || !user.email) {
    logger.error("❌ Génération token: données utilisateur invalides");
    throw new Error("Données utilisateur invalides");
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role || "user",
      isVerified: user.isVerified || false,
      isPremium: user.isPremium || false,
    },
    JWT_SECRET,
    { expiresIn: "7d" } // ✅ 7 JOURS au lieu de 15m
  );
};

const generateRefreshToken = (user) => {
  if (!user._id) {
    logger.error("❌ Génération refresh token: ID manquant");
    throw new Error("ID utilisateur manquant");
  }

  return jwt.sign(
    { id: user._id.toString() },
    JWT_REFRESH_SECRET,
    { expiresIn: "30d" } // ✅ 30 jours pour le refresh
  );
};

// --- REGISTER ---
export const register = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { fullName, email, confirmEmail, password } = req.body;

    logger.info("🚀 REGISTER CONTROLLER STARTED");
    logger.info(`📝 Email: ${email}`);

    // ✅ Validation des champs
    if (!fullName || !email || !confirmEmail || !password) {
      logger.warn("⚠️ VALIDATION: Champs manquants");
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    // ✅ Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn("⚠️ VALIDATION: Email invalide");
      return res.status(400).json({ message: "Format email invalide" });
    }

    if (email.toLowerCase().trim() !== confirmEmail.toLowerCase().trim()) {
      logger.warn("⚠️ VALIDATION: Emails ne correspondent pas");
      return res.status(400).json({ message: "Les emails ne correspondent pas" });
    }

    // ✅ Validation longueur nom
    const trimmedName = fullName.trim();
    if (trimmedName.length < 3) {
      logger.warn("⚠️ VALIDATION: Nom trop court");
      return res.status(400).json({ message: "Le nom doit contenir au moins 3 caractères" });
    }

    if (trimmedName.length > 30) {
      logger.warn("⚠️ VALIDATION: Nom trop long");
      return res.status(400).json({ message: "Le nom ne peut pas dépasser 30 caractères" });
    }

    // ✅ Validation mot de passe
    if (password.length < 6) {
      logger.warn("⚠️ VALIDATION: Mot de passe trop court");
      return res.status(400).json({ message: "Mot de passe trop court (≥6 caractères)" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ✅ Vérifier si l'email existe
    const existingCheck = await User.findOne({ email: normalizedEmail }).lean();
    if (existingCheck) {
      logger.warn(`Email existe: ${normalizedEmail}`);
      return res.status(400).json({ message: "Email déjà utilisé" });
    }

    // ✅ Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // ✅ Créer l'utilisateur
    const newUser = await User.create({
      fullName: trimmedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
      isVerified: false,
      isPremium: false,
    });

    logger.info(`✅ Utilisateur créé: ${newUser.email}`);

    // ✅ Générer les tokens
    const token = generateToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // ✅ Envoyer les cookies
    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
    });

    res.cookie("token", token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    });

    logger.info(`✅ REGISTER OK - Durée: ${Date.now() - startTime}ms`);

    // ✅ Réponse avec user et token
    return res.status(201).json({
      message: "Compte créé avec succès 🎉",
      user: {
        id: newUser._id,
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
        isPremium: newUser.isPremium,
        profilePhoto: newUser.profilePhoto || "/default-avatar.png",
      },
      token,
    });
  } catch (err) {
    logger.error("❌ REGISTER ERROR:", err.message);
    
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    if (err.code === 11000) {
      return res.status(400).json({ message: "Email déjà utilisé" });
    }

    if (!res.headersSent) {
      return res.status(500).json({ message: "Erreur serveur lors de l'inscription" });
    }
  }
};

// --- LOGIN ---
export const login = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { email, password } = req.body;

    logger.info("🔐 LOGIN CONTROLLER STARTED");
    logger.info(`📧 Email: ${email}`);

    // ✅ Validation des champs
    if (!email || !password) {
      logger.warn("⚠️ Login: Champs manquants");
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ✅ Trouver l'utilisateur avec mot de passe
    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    
    if (!user) {
      logger.warn(`⚠️ Login: Utilisateur introuvable (${normalizedEmail})`);
      return res.status(404).json({ message: "Email ou mot de passe incorrect" });
    }

    // ✅ Vérifier si compte banni
    if (user.isBanned) {
      logger.warn(`⚠️ Login: Compte banni (${normalizedEmail})`);
      return res.status(403).json({ message: "Compte suspendu" });
    }

    // ✅ Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      logger.warn(`⚠️ Login: Mot de passe incorrect (${normalizedEmail})`);
      return res.status(400).json({ message: "Email ou mot de passe incorrect" });
    }

    logger.info(`✅ Login réussi: ${user.email} - ${Date.now() - startTime}ms`);

    // ✅ Générer les tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // ✅ Envoyer les cookies
    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
    });

    res.cookie("token", token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    });

    // ✅ Mettre à jour lastLogin (non-bloquant)
    User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch((err) => {
      logger.warn("⚠️ Erreur mise à jour lastLogin:", err.message);
    });

    // ✅ Répondre immédiatement
    return res.status(200).json({
      message: "Connexion réussie ✅",
      user: {
        id: user._id,
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isPremium: user.isPremium,
        profilePhoto: user.profilePhoto || "/default-avatar.png",
        following: user.following || [],
        followers: user.followers || [],
      },
      token,
    });
  } catch (err) {
    logger.error("❌ Login error:", err);
    
    if (!res.headersSent) {
      return res.status(500).json({ message: "Erreur serveur lors de la connexion" });
    }
  }
};

// --- REFRESH TOKEN ---
export const refreshToken = async (req, res) => {
  try {
    const tokenFromCookie = req.cookies.refreshToken;
    
    if (!tokenFromCookie) {
      logger.warn("⚠️ Refresh: Token manquant");
      return res.status(401).json({ message: "Token manquant" });
    }

    // ✅ Vérifier le refresh token
    let decoded;
    try {
      decoded = jwt.verify(tokenFromCookie, JWT_REFRESH_SECRET);
    } catch (err) {
      logger.warn("⚠️ Refresh: Token invalide ou expiré");
      res.clearCookie("refreshToken");
      res.clearCookie("token");
      return res.status(401).json({ message: "Token invalide, reconnectez-vous" });
    }

    if (!decoded.id) {
      logger.error("❌ Refresh: ID manquant dans le token");
      res.clearCookie("refreshToken");
      res.clearCookie("token");
      return res.status(401).json({ message: "Token invalide" });
    }

    // ✅ Récupérer l'utilisateur
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      logger.warn(`⚠️ Refresh: Utilisateur introuvable (${decoded.id})`);
      res.clearCookie("refreshToken");
      res.clearCookie("token");
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (user.isBanned) {
      logger.warn(`⚠️ Refresh: Compte banni (${user.email})`);
      res.clearCookie("refreshToken");
      res.clearCookie("token");
      return res.status(403).json({ message: "Compte suspendu" });
    }

    // ✅ Générer de nouveaux tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // ✅ Envoyer les nouveaux cookies
    res.cookie("refreshToken", newRefreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.cookie("token", newToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logger.info(`🔄 Refresh token OK: ${user.email}`);

    return res.status(200).json({
      token: newToken,
      user: {
        id: user._id,
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isPremium: user.isPremium,
        profilePhoto: user.profilePhoto || "/default-avatar.png",
        following: user.following || [],
        followers: user.followers || [],
      },
    });
  } catch (err) {
    logger.error("❌ Refresh token error:", err);
    
    if (!res.headersSent) {
      res.clearCookie("refreshToken");
      res.clearCookie("token");
      return res.status(500).json({ message: "Erreur serveur" });
    }
  }
};

// --- LOGOUT ---
export const logout = async (req, res) => {
  try {
    res.clearCookie("refreshToken", cookieOptions);
    res.clearCookie("token", cookieOptions);
    logger.info("🔒 Utilisateur déconnecté");
    return res.status(200).json({ message: "Déconnecté avec succès" });
  } catch (err) {
    logger.error("❌ Logout error:", err);
    
    if (!res.headersSent) {
      return res.status(500).json({ message: "Erreur lors de la déconnexion" });
    }
  }
};

// --- GET CURRENT USER ---
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      logger.warn("⚠️ getCurrentUser: Non authentifié");
      return res.status(401).json({ message: "Non authentifié" });
    }

    const user = await User.findById(userId)
      .select("-password")
      .populate("followers", "fullName email profilePhoto")
      .populate("following", "fullName email profilePhoto");
    
    if (!user) {
      logger.warn(`⚠️ getCurrentUser: Utilisateur introuvable (${userId})`);
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isPremium: user.isPremium,
        profilePhoto: user.profilePhoto || "/default-avatar.png",
        coverPhoto: user.coverPhoto,
        bio: user.bio,
        location: user.location,
        website: user.website,
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0,
        followers: user.followers || [],
        following: user.following || [],
      },
    });
  } catch (err) {
    logger.error("❌ getCurrentUser error:", err);
    
    if (!res.headersSent) {
      return res.status(500).json({ message: "Erreur serveur" });
    }
  }
};

export default {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  authLimiter,
};