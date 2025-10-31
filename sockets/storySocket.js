//========================================
// backend/sockets/storySocket.js
// ========================================
import Story from "../models/Story.js";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export function registerStorySocket(io) {
  const activeViewers = new Map(); // storyId -> Map(userId -> viewerData)
  const userSockets = new Map();   // userId -> Set(socketId)
  const MAX_CONNECTIONS = 3;       // max connexions par utilisateur
  const VIEWER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  io.setMaxListeners(20);

  // Middleware d'authentification via cookie ou token
  io.use((socket, next) => {
    const cookies = socket.handshake.headers.cookie;
    let token = null;

    if (cookies) {
      const parsed = cookie.parse(cookies);
      token = parsed.token;
    }
    if (!token && socket.handshake.auth?.token) token = socket.handshake.auth.token;
    if (!token && socket.handshake.query?.token) token = socket.handshake.query.token;

    if (!token) return next(new Error("Token manquant"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        id: decoded.id,
        email: decoded.email || null,
        username: decoded.username || decoded.email || "Utilisateur",
        role: decoded.role || "user",
        isVerified: decoded.isVerified || false,
        isPremium: decoded.isPremium || false,
      };
      next();
    } catch (err) {
      console.log("[Story Socket] Token invalide :", err.message);
      next(new Error("Token invalide"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;

    // Limiter les connexions par utilisateur
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    const socketsSet = userSockets.get(userId);

    if (socketsSet.size >= MAX_CONNECTIONS) {
      console.warn(`[Socket] Trop de connexions pour ${userId}`);
      socket.emit("error", "Trop de connexions simultanées");
      return socket.disconnect(true);
    }

    socketsSet.add(socket.id);
    console.log(`🔌 Socket story connectée : ${socket.id} - User: ${socket.user.username}`);

    // ========================================
    // Événements
    // ========================================

    socket.on("joinStory", ({ storyId, username }) => {
      const finalUsername = username || socket.user.username || "Utilisateur";
      socket.join(`story-${storyId}`);

      if (!activeViewers.has(storyId)) activeViewers.set(storyId, new Map());
      const storyViewers = activeViewers.get(storyId);

      storyViewers.set(userId, {
        username: finalUsername,
        progress: 0,
        socketId: socket.id,
        joinedAt: Date.now(),
        lastUpdate: Date.now(),
        viewedSlides: new Set(), // pour éviter réécriture DB multiple
      });

      const viewersList = Array.from(storyViewers.entries()).map(([id, data]) => ({
        _id: id,
        name: data.username,
        progress: data.progress
      }));

      io.to(`story-${storyId}`).emit("updateViewerList", { storyId, viewers: viewersList });
      console.log(`📖 ${finalUsername} a rejoint la story ${storyId}`);
    });

    socket.on("leaveStory", ({ storyId }) => {
      const storyViewers = activeViewers.get(storyId);
      if (storyViewers) {
        storyViewers.delete(userId);
        if (storyViewers.size === 0) activeViewers.delete(storyId);
        else {
          const viewersList = Array.from(storyViewers.entries()).map(([id, data]) => ({
            _id: id,
            name: data.username,
            progress: data.progress
          }));
          io.to(`story-${storyId}`).emit("updateViewerList", { storyId, viewers: viewersList });
        }
      }
      socket.leave(`story-${storyId}`);
    });

    socket.on("updateViewerProgress", async ({ storyId, progress }) => {
      const storyViewers = activeViewers.get(storyId);
      if (storyViewers && storyViewers.has(userId)) {
        const viewer = storyViewers.get(userId);
        viewer.progress = progress;
        viewer.lastUpdate = Date.now();

        io.to(`story-${storyId}`).emit("updateViewerProgress", {
          storyId,
          viewerId: userId,
          progress,
          username: viewer.username
        });

        if (progress >= 0.95) {
          try {
            const story = await Story.findById(storyId);
            if (story) {
              const slideIndex = Math.floor((story.slides.length - 1) * progress);
              if (story.slides[slideIndex] && !viewer.viewedSlides.has(slideIndex)) {
                const views = story.slides[slideIndex].views || [];
                if (!views.includes(userId)) {
                  story.slides[slideIndex].views.push(userId);
                  await story.save();
                  viewer.viewedSlides.add(slideIndex);

                  io.to(`story-${storyId}`).emit("slideViewed", {
                    slideIndex,
                    userId,
                    username: viewer.username,
                  });
                }
              }
            }
          } catch (err) {
            console.error("[Story Socket] Erreur markSlideViewed :", err);
          }
        }
      }
    });

    socket.on("newStoryCreated", (story) => socket.broadcast.emit("newStoryCreated", story));

    socket.on("sendStoryViewed", ({ storyId, slideIndex }) =>
      socket.broadcast.emit("receiveStoryViewed", { storyId, slideIndex, userId })
    );

    socket.on("sendStoryReaction", ({ storyId, slideIndex, reaction }) => {
      const username = socket.user.username;
      socket.broadcast.emit("receiveStoryReaction", { storyId, slideIndex, reaction, userId, username });
      io.to(`story-${storyId}`).emit("receiveStoryReaction", { storyId, slideIndex, reaction, userId, username });
    });

    socket.on("storyDeleted", ({ storyId }) => {
      activeViewers.delete(storyId);
      io.emit("storyDeleted", storyId);
    });

    // ========================================
    // Déconnexion
    // ========================================
    socket.on("disconnect", () => {
      // Nettoyer les viewers
      for (const [storyId, viewers] of activeViewers.entries()) {
        for (const [uid, data] of viewers.entries()) {
          if (data.socketId === socket.id) {
            viewers.delete(uid);
            if (viewers.size === 0) activeViewers.delete(storyId);
            else {
              const viewersList = Array.from(viewers.entries()).map(([id, d]) => ({
                _id: id,
                name: d.username,
                progress: d.progress
              }));
              io.to(`story-${storyId}`).emit("updateViewerList", { storyId, viewers: viewersList });
            }
          }
        }
      }

      // Nettoyer userSockets
      const s = userSockets.get(userId);
      if (s) {
        s.delete(socket.id);
        if (s.size === 0) userSockets.delete(userId);
      }

      console.log(`🔌 Socket story déconnecté : ${socket.id}`);
    });
  });

  // ========================================
  // Nettoyage périodique des viewers inactifs
  // ========================================
  setInterval(() => {
    const now = Date.now();
    for (const [storyId, viewers] of activeViewers.entries()) {
      let updated = false;
      for (const [uid, data] of viewers.entries()) {
        if (now - data.lastUpdate > VIEWER_TIMEOUT) {
          viewers.delete(uid);
          console.log(`🧹 Viewer inactif supprimé: ${data.username}`);
          updated = true;
        }
      }
      if (viewers.size === 0) activeViewers.delete(storyId);
      else if (updated) {
        const viewersList = Array.from(viewers.entries()).map(([id, d]) => ({
          _id: id,
          name: d.username,
          progress: d.progress
        }));
        io.to(`story-${storyId}`).emit("updateViewerList", { storyId, viewers: viewersList });
      }
    }
  }, 30 * 1000); // toutes les 30 secondes

  console.log("✅ Socket Story initialisé");
}

// Alias pour compatibilité
export const initStoriesSocket = registerStorySocket;