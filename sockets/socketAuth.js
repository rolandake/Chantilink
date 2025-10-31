// backend/sockets/socketAuth.js - VERSION CORRIGÉE
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import pino from "pino";

// ============================
// ⚙️ Logger configuration
// ============================
const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM:ss" },
  },
});

// ============================
// ⚡ Middleware Socket.io
// ============================
const activeSockets = new Map();

export const verifySocketToken = async (socket, next) => {
  try {
    // ✅ VÉRIFIER SI DÉJÀ AUTHENTIFIÉ AU NIVEAU GLOBAL
    if (socket.data?.user?.id) {
      logger.info(`✅ [Socket Auth Namespace] Déjà authentifié: ${socket.data.user.email}`);
      return next();
    }

    logger.info(`🔍 [Socket Auth Namespace] Vérification manuelle du token...`);

    // 🔍 EXTRACTION DU TOKEN
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
      extractTokenFromCookie(socket.handshake.headers?.cookie, "token");

    logger.info(`🔍 [Socket] Token extrait: ${token ? "✅ Présent" : "❌ Manquant"}`);
    logger.info(`🔍 [Socket] Auth object:`, socket.handshake.auth);

    if (!token) {
      logger.warn(`🚫 [Socket] Token manquant (${socket.id})`);
      return next(new Error("MISSING_TOKEN"));
    }

    // ✅ VÉRIFICATION JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      logger.info(`✅ [Socket] Token décodé:`, {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        exp: new Date(decoded.exp * 1000).toISOString(),
      });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        logger.warn(`⏳ [Socket] Token expiré (${socket.id})`);
        logger.info(`⏳ [Socket] Expiration:`, new Date(err.expiredAt).toISOString());
        return next(new Error("TOKEN_EXPIRED"));
      }
      logger.error(`❌ [Socket] Token invalide: ${err.message}`);
      return next(new Error("INVALID_TOKEN"));
    }

    // ✅ RECHERCHE UTILISATEUR
    const user = await User.findById(decoded.id).select(
      "_id username role fullName isVerified isPremium email bio location"
    );

    if (!user) {
      logger.warn(`🚫 [Socket] Utilisateur introuvable (${decoded.id})`);
      return next(new Error("USER_NOT_FOUND"));
    }

    logger.info(`✅ [Socket] Utilisateur trouvé: ${user.username || user.fullName} (${user._id})`);

    // 🔒 LIMITATION DES CONNEXIONS SIMULTANÉES
    const userId = user._id.toString();
    const currentSockets = activeSockets.get(userId) || [];
    if (currentSockets.length >= 5) {
      logger.warn(`🚫 [Socket] Trop de connexions pour ${user.username} (${currentSockets.length}/5)`);
      return next(new Error("TOO_MANY_CONNECTIONS"));
    }
    activeSockets.set(userId, [...currentSockets, socket.id]);

    // ✅ ATTACHER LES DONNÉES UTILISATEUR À socket.data (IMPORTANT!)
    socket.data = socket.data || {};
    socket.data.user = {
      id: userId,
      email: user.email,
      username: user.username || user.fullName || user.email,
      fullName: user.fullName,
      role: user.role || "user",
      isVerified: user.isVerified || false,
      isPremium: user.isPremium || false,
      bio: user.bio || "",
      location: user.location || "",
      displayName: user.username || user.fullName || user.email,
    };
    socket.data.token = token;

    // 🧹 NETTOYAGE À LA DÉCONNEXION
    socket.on("disconnect", () => {
      const list = activeSockets.get(userId) || [];
      activeSockets.set(
        userId,
        list.filter((id) => id !== socket.id)
      );
      logger.info(`🧹 [Socket] Nettoyé connexion de ${socket.data.user.displayName}`);
    });

    // ✅ LOG FINAL
    logger.info(
      `⚡ [Socket] Connexion autorisée: ${socket.data.user.displayName} (${socket.data.user.role}) - Socket ID: ${socket.id}`
    );

    next();
  } catch (err) {
    logger.error(`❌ [Socket] Erreur auth critique:`, {
      message: err.message,
      stack: err.stack,
    });
    next(new Error("AUTH_ERROR"));
  }
};

export const verifySocketAdmin = async (socket, next) => {
  await verifySocketToken(socket, (err) => {
    if (err) return next(err);
    if (socket.data.user.role !== "admin") {
      logger.warn(`🚫 [Socket] Accès admin refusé (${socket.data.user.username})`);
      return next(new Error("ADMIN_REQUIRED"));
    }
    logger.info(`✅ [Socket] Admin connecté: ${socket.data.user.username}`);
    next();
  });
};

// ============================
// ⚡ Protection des namespaces
// ============================
export const protectSocketNamespaces = (io) => {
  logger.info("🔒 [SocketAuth] Configuration des namespaces...");

  // Admin namespace
  io.of("/admin").use(verifySocketAdmin);
  logger.info("✅ [SocketAuth] Namespace /admin protégé");

  // Premium namespace
  io.of("/engineering").use(async (socket, next) => {
    await verifySocketToken(socket, (err) => {
      if (err) return next(err);
      if (!["premium", "admin"].includes(socket.data.user.role)) {
        logger.warn(
          `🚫 [Socket] Accès engineering refusé (${socket.data.user.username})`
        );
        return next(new Error("PREMIUM_REQUIRED"));
      }
      logger.info(`✅ [Socket] Engineering OK: ${socket.data.user.username}`);
      next();
    });
  });
  logger.info("✅ [SocketAuth] Namespace /engineering protégé");

  // Namespaces publics (mais authentifiés)
  io.of("/messages").use(verifySocketToken);
  logger.info("✅ [SocketAuth] Namespace /messages protégé");
  
  io.of("/stories").use(verifySocketToken);
  logger.info("✅ [SocketAuth] Namespace /stories protégé");
  
  io.of("/videos").use(verifySocketToken);
  logger.info("✅ [SocketAuth] Namespace /videos protégé");

  logger.info("🔒 [SocketAuth] Tous les namespaces sont protégés");
};

// ============================
// 🔧 Utilitaires
// ============================
function extractTokenFromCookie(cookieString, name) {
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

// ============================
// ⚙️ Middleware HTTP (Express)
// ============================
export const verifyTokenUser = (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      logger.warn("🚫 [HTTP] Token manquant");
      return res.status(401).json({ error: "Token manquant" });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    logger.info(`✅ [HTTP] Auth OK: ${verified.username || verified.id}`);
    next();
  } catch (err) {
    logger.error(`❌ [HTTP] Token invalide: ${err.message}`);
    return res.status(403).json({ error: "Token invalide" });
  }
};

export const verifyTokenAdmin = (req, res, next) => {
  verifyTokenUser(req, res, () => {
    if (req.user?.role !== "admin") {
      logger.warn("🚫 [HTTP] Accès admin refusé");
      return res.status(403).json({ error: "Accès administrateur requis" });
    }
    logger.info("✅ [HTTP] Auth admin OK");
    next();
  });
};

export const verifyVerifiedUser = (req, res, next) => {
  if (!req.user?.isVerified) {
    logger.warn("🚫 [HTTP] Compte non vérifié");
    return res.status(403).json({ error: "Compte non vérifié" });
  }
  next();
};

export const verifyPremiumUser = (req, res, next) => {
  if (!req.user?.isPremium) {
    logger.warn("🚫 [HTTP] Compte non Premium");
    return res.status(403).json({ error: "Abonnement Premium requis" });
  }
  next();
};