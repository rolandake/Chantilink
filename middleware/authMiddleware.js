// backend/middleware/auth.js - VERSION PRODUCTION READY
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import rateLimit from "express-rate-limit";
import logger from "../config/logger.js"; // Import du logger centralisé

const isDevelopment = process.env.NODE_ENV !== "production";

// ===========================
// 🔒 VALIDATION SECRETS JWT AU DÉMARRAGE
// ===========================
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  logger.fatal("❌ ERREUR FATALE: JWT_SECRET ou JWT_REFRESH_SECRET manquant dans .env");
  process.exit(1);
}

// Validation longueur minimale des secrets
if (JWT_SECRET.length < 32 || JWT_REFRESH_SECRET.length < 32) {
  logger.warn("⚠️ ATTENTION: Les secrets JWT devraient faire au moins 32 caractères");
}

logger.info("✅ Secrets JWT chargés avec succès");

// ===========================
// Rate limiter pour endpoints sensibles
// ===========================
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives max
  message: { message: "Trop de tentatives, réessayez plus tard." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limit pour les admins en dev
    return isDevelopment && req.user?.role === "admin";
  },
});

// ===========================
// Blacklist refresh tokens (utiliser Redis en prod)
// ===========================
const refreshTokenBlacklist = new Set();

function blacklistRefreshToken(token) { 
  refreshTokenBlacklist.add(token);
  // Auto-cleanup après 7 jours
  setTimeout(() => refreshTokenBlacklist.delete(token), 7 * 24 * 60 * 60 * 1000);
}

function isRefreshTokenBlacklisted(token) { 
  return refreshTokenBlacklist.has(token); 
}

// ===========================
// 🎯 LIMITATION CONNEXIONS SOCKET PAR UTILISATEUR
// ===========================
const activeSocketsPerUser = new Map();
const MAX_SOCKETS_PER_USER = isDevelopment ? 10 : 5;

export function trackSocket(userId, socketId) {
  if (!activeSocketsPerUser.has(userId)) {
    activeSocketsPerUser.set(userId, new Set());
  }
  
  const userSockets = activeSocketsPerUser.get(userId);
  
  if (userSockets.size >= MAX_SOCKETS_PER_USER) {
    logger.warn({
      msg: "Limite de connexions socket atteinte",
      userId,
      current: userSockets.size,
      max: MAX_SOCKETS_PER_USER
    });
    return false;
  }
  
  userSockets.add(socketId);
  logger.debug({
    msg: "Socket trackée",
    userId,
    socketId,
    total: userSockets.size
  });
  return true;
}

export function untrackSocket(userId, socketId) {
  if (activeSocketsPerUser.has(userId)) {
    const userSockets = activeSocketsPerUser.get(userId);
    userSockets.delete(socketId);
    
    if (userSockets.size === 0) {
      activeSocketsPerUser.delete(userId);
    }
    
    logger.debug({
      msg: "Socket détrackée",
      userId,
      socketId,
      remaining: userSockets.size
    });
  }
}

// Cleanup périodique des sockets inactives (toutes les heures)
setInterval(() => {
  const now = Date.now();
  logger.debug({
    msg: "Cleanup sockets",
    totalUsers: activeSocketsPerUser.size
  });
}, 60 * 60 * 1000);

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
      logger.warn({
        msg: "Token manquant",
        type: isSocket ? "Socket" : "HTTP",
        path: isSocket ? null : req.path
      });
      return handleError("Token manquant", 401);
    }

    try {
      // Vérification du token principal
      const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: allowExpired });
      
      // 🛡️ Validation de la structure du token
      if (!decoded.id) {
        logger.error({
          msg: "Token invalide: ID manquant",
          decoded: Object.keys(decoded)
        });
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
            logger.warn("Refresh token blacklisté");
            throw new Error("Refresh token blacklisté");
          }

          const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
          
          if (!payload.id) {
            throw new Error("Refresh token invalide: ID manquant");
          }

          const user = await User.findById(payload.id).select("-password").lean();
          
          if (!user) {
            logger.warn({
              msg: "Utilisateur introuvable lors du refresh",
              userId: payload.id
            });
            throw new Error("Utilisateur introuvable");
          }
          
          if (user.isBanned) {
            logger.warn({
              msg: "Tentative d'accès avec compte banni",
              email: user.email,
              userId: user._id
            });
            throw new Error("Compte banni");
          }

          // Générer nouveaux tokens
          const newToken = jwt.sign(
            {
              id: user._id.toString(),
              email: user.email,
              role: user.role || "user",
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

          // Configuration cookies sécurisée
          const cookieOptions = {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
          };

          // Envoyer les nouveaux cookies
          res.cookie("token", newToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000, // 15 minutes
          });
          
          res.cookie("refreshToken", newRefreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
          });

          logger.info({
            msg: "Token refresh réussi",
            email: user.email,
            userId: user._id
          });

          const stopped = await attachUser(reqOrSocket, {
            id: user._id.toString(),
            email: user.email,
            role: user.role || "user",
            isVerified: user.isVerified || false,
            isPremium: user.isPremium || false,
          });
          
          if (stopped) return;
          return nextFn();
          
        } catch (refreshErr) {
          logger.error({
            msg: "Refresh token invalide",
            error: refreshErr.message,
            type: refreshErr.name
          });
          clearCookies(res);
          return handleError("Session expirée, reconnectez-vous", 401);
        }
      }

      // Erreur token invalide
      logger.error({
        msg: "Token invalide",
        error: err.message,
        type: err.name,
        isSocket
      });
      
      if (!isSocket) {
        clearCookies(res);
      }
      
      return handleError("Token invalide ou expiré", 401);
    }

    // =========================
    // Helper pour attacher user
    // =========================
    async function attachUser(reqOrSocket, decodedOrUser) {
      const id = decodedOrUser._id || decodedOrUser.id;
      
      if (!id) {
        logger.error("ID utilisateur manquant dans le token");
        return handleError("Token invalide", 401);
      }

      try {
        // 🛡️ Vérifier que l'utilisateur existe toujours en DB
        const userExists = await User.findById(id)
          .select("_id email role isVerified isPremium isBanned")
          .lean();
        
        if (!userExists) {
          logger.warn({
            msg: "Utilisateur supprimé",
            userId: id
          });
          return handleError("Utilisateur introuvable", 404);
        }

        if (userExists.isBanned) {
          logger.warn({
            msg: "Tentative d'accès avec compte banni",
            email: userExists.email,
            userId: userExists._id
          });
          return handleError("Compte suspendu", 403);
        }

        const userObj = {
          id: id.toString(),
          _id: id.toString(), // Alias pour compatibilité
          email: userExists.email || decodedOrUser.email,
          role: userExists.role || "user",
          isVerified: userExists.isVerified || false,
          isPremium: userExists.isPremium || false,
        };

        // Vérifications des permissions
        if (requiredRole && userObj.role !== requiredRole) {
          logger.warn({
            msg: "Accès refusé: rôle insuffisant",
            userRole: userObj.role,
            requiredRole,
            userId: userObj.id
          });
          return handleError(`Accès réservé aux ${requiredRole}s`, 403);
        }
        
        if (mustBeVerified && !userObj.isVerified) {
          logger.warn({
            msg: "Accès refusé: compte non vérifié",
            email: userObj.email
          });
          return handleError("Compte non vérifié", 403);
        }
        
        if (mustBePremium && !userObj.isPremium) {
          logger.warn({
            msg: "Accès refusé: premium requis",
            email: userObj.email
          });
          return handleError("Fonctionnalité réservée aux Premium", 403);
        }

        // 🎯 Pour Socket.io: vérifier limite de connexions
        if (isSocket) {
          const socketId = reqOrSocket.id;
          if (!trackSocket(userObj.id, socketId)) {
            logger.error({
              msg: "Trop de connexions simultanées",
              email: userObj.email,
              userId: userObj.id
            });
            return handleError("Trop de connexions simultanées", 429);
          }

          // Cleanup à la déconnexion
          reqOrSocket.on("disconnect", () => {
            untrackSocket(userObj.id, socketId);
            logger.info({
              msg: "Socket déconnectée",
              email: userObj.email,
              socketId
            });
          });
        }

        // Attacher l'utilisateur
        if (isSocket) {
          reqOrSocket.data = reqOrSocket.data || {};
          reqOrSocket.data.user = userObj;
          logger.info({
            msg: "Connexion socket autorisée",
            email: userObj.email,
            role: userObj.role
          });
        } else {
          reqOrSocket.user = userObj;
        }

        return false; // Pas d'erreur
        
      } catch (dbError) {
        logger.error({
          msg: "Erreur base de données lors de l'attachement user",
          error: dbError.message,
          userId: id
        });
        return handleError("Erreur serveur", 500);
      }
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
      if (!isSocket && res.clearCookie) {
        res.clearCookie("token", { path: "/" });
        res.clearCookie("refreshToken", { path: "/" });
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
// Middlewares HTTP prédéfinis
// ===========================
export const verifyTokenUser = createAuthMiddleware();
export const verifyTokenAdmin = createAuthMiddleware({ requiredRole: "admin" });
export const verifyVerifiedUser = createAuthMiddleware({ mustBeVerified: true });
export const verifyPremiumUser = createAuthMiddleware({ mustBePremium: true });

// Alias pratique
export const verifyToken = verifyTokenUser;

// ===========================
// Middlewares Socket.io prédéfinis
// ===========================
export const verifySocketToken = createAuthMiddleware({ forSocket: true });
export const verifySocketAdmin = createAuthMiddleware({ forSocket: true, requiredRole: "admin" });

// ===========================
// Utilitaires d'export
// ===========================
export const getActiveSocketsCount = () => {
  let total = 0;
  activeSocketsPerUser.forEach((sockets) => {
    total += sockets.size;
  });
  return {
    totalUsers: activeSocketsPerUser.size,
    totalSockets: total,
  };
};

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
  getActiveSocketsCount,
  logger, // Export du logger pour usage dans d'autres fichiers
};