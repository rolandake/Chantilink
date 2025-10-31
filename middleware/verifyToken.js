// backend/middleware/verifyToken
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// --- Blacklist simple pour refresh tokens (remplacer par Redis/DB en prod) ---
const refreshTokenBlacklist = new Set();

/**
 * Middleware universel HTTP + Socket.io
 * options:
 *  - requiredRole: string ("admin")
 *  - mustBeVerified: boolean
 *  - mustBePremium: boolean
 *  - allowExpired: boolean (pour refresh token)
 *  - forSocket: boolean
 */
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

    // --- Récupération token ---
    let token = isSocket
      ? req.headers["x-access-token"] || null
      : req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : req.cookies?.token;

    const refreshToken = isSocket ? null : req.cookies?.refreshToken;

    if (!token) return handleError("Token manquant", 401);

    if (!process.env.JWT_SECRET || (!isSocket && !process.env.REFRESH_SECRET))
      return handleError("Clés JWT absentes", 500);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: allowExpired });
      const stopped = await attachUser(reqOrSocket, decoded);
      if (stopped) return;
      return nextFn();
    } catch (err) {
      // --- Token expiré HTTP → refresh automatique ---
      if (err.name === "TokenExpiredError" && refreshToken && !isSocket) {
        if (refreshTokenBlacklist.has(refreshToken))
          return handleError("Refresh token invalide", 401);

        try {
          const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
          const user = await User.findById(payload.id);
          if (!user) throw new Error("Utilisateur introuvable");

          // Rotation du refresh token
          refreshTokenBlacklist.add(refreshToken);
          setTimeout(() => refreshTokenBlacklist.delete(refreshToken), 24 * 60 * 60 * 1000); // 1 jour

          const newToken = jwt.sign(
            {
              id: user._id.toString(),
              email: user.email,
              role: user.role,
              isVerified: user.isVerified,
              isPremium: user.isPremium,
            },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
          );

          const newRefreshToken = jwt.sign(
            { id: user._id.toString() },
            process.env.REFRESH_SECRET,
            { expiresIn: "7d" }
          );

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

          const stopped = await attachUser(reqOrSocket, user);
          if (stopped) return;
          return nextFn();
        } catch {
          return handleError("Refresh token invalide, reconnectez-vous", 401);
        }
      }

      return handleError("Token invalide ou expiré", 401);
    }

    // --- Helper attachUser ---
    async function attachUser(reqOrSocket, decodedOrUser) {
      const isUserDoc = decodedOrUser._id !== undefined;
      const id = isUserDoc ? decodedOrUser._id : decodedOrUser.id;
      if (!id) return handleError("Token invalide", 401);

      const userObj = {
        id: id.toString(),
        email: decodedOrUser.email || null,
        role: decodedOrUser.role || "user",
        isVerified: decodedOrUser.isVerified || false,
        isPremium: decodedOrUser.isPremium || false,
      };

      if (requiredRole && userObj.role !== requiredRole) return handleError(`Accès réservé aux ${requiredRole}s`, 403);
      if (mustBeVerified && !userObj.isVerified) return handleError("Compte non vérifié", 403);
      if (mustBePremium && !userObj.isPremium) return handleError("Fonctionnalité réservée aux Premium", 403);

      if (isSocket) reqOrSocket.data = { ...reqOrSocket.data, user: userObj };
      else reqOrSocket.user = userObj;

      return false;
    }

    // --- Helper erreurs ---
    function handleError(message, code = 401) {
      if (isSocket) {
        const error = new Error(message);
        error.code = code;
        return nextFn(error);
      }
      return res.status(code).json({ message });
    }
  };
}

// --- Middlewares HTTP ---
export const verifyTokenUser = createAuthMiddleware();
export const verifyTokenAdmin = createAuthMiddleware({ requiredRole: "admin" });
export const verifyVerifiedUser = createAuthMiddleware({ mustBeVerified: true });
export const verifyPremiumUser = createAuthMiddleware({ mustBePremium: true });

// --- Middlewares Socket.io ---
export const verifySocketToken = createAuthMiddleware({ forSocket: true });
export const verifySocketAdmin = createAuthMiddleware({ forSocket: true, requiredRole: "admin"})