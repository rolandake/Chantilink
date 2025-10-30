// backend/middleware/auth.js - VERSION ULTRA ROBUSTE
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import rateLimit from "express-rate-limit";
import pino from "pino";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM:ss" },
  },
});

// ===========================
// 🔒 VALIDATION SECRETS JWT AU DÉMARRAGE
// ===========================
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  logger.fatal("❌ ERREUR FATALE: JWT_SECRET ou JWT_REFRESH_SECRET manquant dans .env");
  process.exit(1);
}

logger.info("✅ Secrets JWT chargés avec succès");

// ===========================
// Rate limiter pour endpoints sensibles
// ===========================
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Trop de tentatives, réessayez plus tard." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===========================
// Blacklist refresh tokens (utiliser Redis en prod)
// ===========================
const refreshTokenBlacklist = new Set();

function blacklistRefreshToken(token) { 
  refreshTokenBlacklist.add(token); 
  setTimeout(() => refreshTokenBlacklist.delete(token), 8 * 24 * 60 * 60 * 1000);
}

function isRefreshTokenBlacklisted(token) { 
  return refreshTokenBlacklist.has(token); 
}

// ===========================
// 🎯 LIMITATION CONNEXIONS SOCKET PAR UTILISATEUR
// ===========================
const activeSocketsPerUser = new Map();
const MAX_SOCKETS_PER_USER = 5;

export function trackSocket(userId, socketId) {
  if (!activeSocketsPerUser.has(userId)) {
    activeSocketsPerUser.set(userId, new Set());
  }
  
  const userSockets = activeSocketsPerUser.get(userId);
  
  if (userSockets.size >= MAX_SOCKETS_PER_USER) {
    logger.warn(`🚫 [Socket] Limite atteinte pour user ${userId}: ${userSockets.size} connexions`);
    return false;
  }
  
  userSockets.add(socketId);
  return true;
}

export function untrackSocket(userId, socketId) {
  if (activeSocketsPerUser.has(userId)) {
    const userSockets = activeSocketsPerUser.get(userId);
    userSockets.delete(socketId);
    if (userSockets.size === 0) {
      activeSocketsPerUser.delete(userId);
    }
  }
}

// ===========================
// Middleware universel HTTP + Socket.io
// ===========================
export function createAuthMiddleware({
  requiredRole = null,
  mustBeVerified = false,
  mustBePremium = false,
  allowExpired = false,
  forSocket = false,
} = {}) {
  return async (reqOrSocket, resOrNext, next) => {
    const isSocket = forSocket;
    const req = isSocket ? reqOrSocket.handshake : reqOrSocket;
    const res = isSocket ? {} : resOrNext;
    const nextFn = isSocket ? resOrNext : next;

    // ------------------------
    // 🔑 Récupération du token
    // ------------------------
    const token = isSocket
      ? req.auth?.token || req.query?.token || extractCookie(req.headers?.cookie, "token")
      : req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : req.cookies?.token;

    const refreshToken = isSocket ? null : req.cookies?.refreshToken;

    if (!token) {
      logger.warn(`🚫 [${isSocket ? 'Socket' : 'HTTP'}] Token manquant`);
      return handleError("Token manquant", 401);
    }

    try {
      // Vérification du token principal
      const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: allowExpired });
      
      // 🛡️ Validation de la structure du token
      if (!decoded.id) {
        logger.error("❌ Token invalide: ID manquant");
        throw new Error("Token structure invalide");
      }

      const stopped = await attachUser(reqOrSocket, decoded);
      if (stopped) return;
      
      return nextFn();
      
    } catch (err) {
      // 🔄 Token expiré → tentative de refresh pour HTTP uniquement
      if (err.name === "TokenExpiredError" && refreshToken && !isSocket) {
        try {
          // Vérifier blacklist
          if (isRefreshTokenBlacklisted(refreshToken)) {
            logger.warn("❌ Refresh token blacklisté");
            throw new Error("Refresh token blacklisté");
          }

          const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
          
          if (!payload.id) {
            throw new Error("Refresh token invalide: ID manquant");
          }

          const user = await User.findById(payload.id).select("-password");
          
          if (!user) {
            logger.warn(`❌ Utilisateur introuvable: ${payload.id}`);
            throw new Error("Utilisateur introuvable");
          }
          
          if (user.isBanned) {
            logger.warn(`❌ Compte banni: ${user.email}`);
            throw new Error("Compte banni");
          }

          // Générer nouveaux tokens
          const newToken = jwt.sign(
            {
              id: user._id.toString(),
              email: user.email,
              role: user.role,
              isVerified: user.isVerified || false,
              isPremium: user.isPremium || false,
            },
            JWT_SECRET,
            { expiresIn: "15m" }
          );

          const newRefreshToken = jwt.sign(
            { id: user._id.toString() },
            JWT_REFRESH_SECRET,
            { expiresIn: "7d" }
          );

          // Blacklister l'ancien refresh token
          blacklistRefreshToken(refreshToken);

          // Envoyer les nouveaux cookies
          res.cookie("token", newToken, {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 15 * 60 * 1000,
          });
          
          res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000,
          });

          logger.info(`🔄 Token refresh réussi: ${user.email}`);

          const stopped = await attachUser(reqOrSocket, {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            isVerified: user.isVerified || false,
            isPremium: user.isPremium || false,
          });
          
          if (stopped) return;
          return nextFn();
          
        } catch (refreshErr) {
          logger.error("❌ Refresh token invalide:", refreshErr.message);
          clearCookies(res);
          return handleError("Session expirée, reconnectez-vous", 401);
        }
      }

      // Erreur token invalide
      logger.error("⚠️ Token invalide:", err.message);
      clearCookies(res);
      return handleError("Token invalide ou expiré", 401);
    }

    // =========================
    // Helper pour attacher user
    // =========================
    async function attachUser(reqOrSocket, decodedOrUser) {
      const id = decodedOrUser._id || decodedOrUser.id;
      
      if (!id) {
        logger.error("❌ ID utilisateur manquant dans le token");
        return handleError("Token invalide", 401);
      }

      // 🛡️ Vérifier que l'utilisateur existe toujours en DB
      const userExists = await User.findById(id).select("_id email role isVerified isPremium isBanned").lean();
      
      if (!userExists) {
        logger.warn(`❌ Utilisateur supprimé: ${id}`);
        return handleError("Utilisateur introuvable", 404);
      }

      if (userExists.isBanned) {
        logger.warn(`❌ Compte banni: ${userExists.email}`);
        return handleError("Compte suspendu", 403);
      }

      const userObj = {
        id: id.toString(),
        email: userExists.email || decodedOrUser.email,
        role: userExists.role || "user",
        isVerified: userExists.isVerified || false,
        isPremium: userExists.isPremium || false,
      };

      // Vérifications des permissions
      if (requiredRole && userObj.role !== requiredRole) {
        logger.warn(`🚫 Accès refusé: role ${userObj.role} != ${requiredRole}`);
        return handleError(`Accès réservé aux ${requiredRole}s`, 403);
      }
      
      if (mustBeVerified && !userObj.isVerified) {
        logger.warn("🚫 Compte non vérifié");
        return handleError("Compte non vérifié", 403);
      }
      
      if (mustBePremium && !userObj.isPremium) {
        logger.warn("🚫 Premium requis");
        return handleError("Fonctionnalité réservée aux Premium", 403);
      }

      // 🎯 Pour Socket.io: vérifier limite de connexions
      if (isSocket) {
        const socketId = reqOrSocket.id;
        if (!trackSocket(userObj.id, socketId)) {
          logger.error(`🚫 [Socket] Trop de connexions pour ${userObj.email}`);
          return handleError("Trop de connexions simultanées", 429);
        }

        // Cleanup à la déconnexion
        reqOrSocket.on("disconnect", () => {
          untrackSocket(userObj.id, socketId);
          logger.info(`🔌 [Socket] Déconnexion: ${userObj.email}`);
        });
      }

      // Attacher l'utilisateur
      if (isSocket) {
        reqOrSocket.data = reqOrSocket.data || {};
        reqOrSocket.data.user = userObj;
        logger.info(`✅ [Socket] Connexion autorisée: ${userObj.email} (${userObj.role})`);
      } else {
        reqOrSocket.user = userObj;
      }

      return false;
    }

    // =========================
    // Helpers erreurs unifiés
    // =========================
    function handleError(message, code = 401) {
      if (isSocket) {
        const error = new Error(message);
        error.code = code;
        return nextFn(error);
      }
      return res.status(code).json({ message });
    }

    function clearCookies(res) {
      if (!isSocket) {
        res.clearCookie("token");
        res.clearCookie("refreshToken");
      }
    }

    function extractCookie(cookieString, name) {
      if (!cookieString) return null;
      const match = cookieString.match(new RegExp(`${name}=([^;]+)`));
      return match ? match[1] : null;
    }
  };
}

// ===========================
// Middlewares HTTP
// ===========================
export const verifyTokenUser = createAuthMiddleware();
export const verifyTokenAdmin = createAuthMiddleware({ requiredRole: "admin" });
export const verifyVerifiedUser = createAuthMiddleware({ mustBeVerified: true });
export const verifyPremiumUser = createAuthMiddleware({ mustBePremium: true });

// Alias pratique
export const verifyToken = verifyTokenUser;

// ===========================
// Middlewares Socket.io
// ===========================
export const verifySocketToken = createAuthMiddleware({ forSocket: true });
export const verifySocketAdmin = createAuthMiddleware({ forSocket: true, requiredRole: "admin" });

// ===========================
// Export agrégé
// ===========================
export default {
  verifyToken,
  verifyTokenUser,
  verifyTokenAdmin,
  verifyVerifiedUser,
  verifyPremiumUser,
  verifySocketToken,
  verifySocketAdmin,
  authRateLimiter,
  trackSocket,
  untrackSocket,
};