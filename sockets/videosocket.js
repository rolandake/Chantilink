import pino from "pino";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM:ss" },
  },
});

export const initializeSocket = (io) => {
  const videoNamespace = io.of("/videos");

  videoNamespace.on("connection", (socket) => {
    // Récupérer les données utilisateur (attachées par le middleware global)
    const user = socket.data?.user || socket.user;
    const { email, id, _id, role, username } = user || {};

    // Vérifier authentification
    if (!user || !id) {
      logger.error(`❌ [Videos] Pas de données utilisateur pour socket ${socket.id}`);
      socket.emit("error", {
        message: "Authentification échouée",
      });
      socket.disconnect(true);
      return;
    }

    logger.info(
      `✅ [Videos] ${email} connecté (${socket.id}) - Role: ${role}`
    );

    // ========================================
    // ÉVÉNEMENT: JOIN VIDEO ROOM
    // ========================================
    socket.on("joinVideoRoom", (videoId) => {
      try {
        if (!videoId) {
          logger.warn(`⚠️ [Videos] joinVideoRoom sans videoId de ${email}`);
          socket.emit("error", { message: "videoId requis" });
          return;
        }

        const roomName = `video-${videoId}`;
        socket.join(roomName);

        const room = videoNamespace.adapter.rooms.get(roomName);
        const viewerCount = room?.size || 1;

        logger.info(
          `📹 [Videos] ${email} a rejoint la vidéo ${videoId} (${viewerCount} spectateurs)`
        );

        // Notifier les autres utilisateurs
        videoNamespace.to(roomName).emit("userJoinedVideo", {
          userId: id,
          email,
          username,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        logger.error(`❌ [Videos] Erreur joinVideoRoom:`, err.message);
        socket.emit("error", { message: err.message });
      }
    });

    // ========================================
    // ÉVÉNEMENT: LEAVE VIDEO ROOM
    // ========================================
    socket.on("leaveVideoRoom", (videoId) => {
      try {
        if (!videoId) {
          logger.warn(`⚠️ [Videos] leaveVideoRoom sans videoId de ${email}`);
          return;
        }

        const roomName = `video-${videoId}`;
        socket.leave(roomName);

        const room = videoNamespace.adapter.rooms.get(roomName);
        const viewerCount = room?.size || 0;

        logger.info(
          `📹 [Videos] ${email} a quitté la vidéo ${videoId} (${viewerCount} spectateurs restants)`
        );

        // Notifier les autres utilisateurs
        videoNamespace.to(roomName).emit("userLeftVideo", {
          userId: id,
          email,
          username,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        logger.error(`❌ [Videos] Erreur leaveVideoRoom:`, err.message);
      }
    });

    // ========================================
    // ÉVÉNEMENT: JOIN LIVE ROOM
    // ========================================
    socket.on("joinLiveRoom", (liveId) => {
      try {
        if (!liveId) {
          logger.warn(`⚠️ [Videos] joinLiveRoom sans liveId de ${email}`);
          socket.emit("error", { message: "liveId requis" });
          return;
        }

        const roomName = `live-${liveId}`;
        socket.join(roomName);

        const room = videoNamespace.adapter.rooms.get(roomName);
        const viewerCount = room?.size || 1;

        logger.info(
          `🔴 [Videos] ${email} a rejoint le live ${liveId} (${viewerCount} spectateurs)`
        );

        // Notifier du nouveau compte de spectateurs
        videoNamespace.to(roomName).emit("updateViewers", {
          liveId,
          viewerCount,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        logger.error(`❌ [Videos] Erreur joinLiveRoom:`, err.message);
        socket.emit("error", { message: err.message });
      }
    });

    // ========================================
    // ÉVÉNEMENT: LEAVE LIVE ROOM
    // ========================================
    socket.on("leaveLiveRoom", (liveId) => {
      try {
        if (!liveId) {
          logger.warn(`⚠️ [Videos] leaveLiveRoom sans liveId de ${email}`);
          return;
        }

        const roomName = `live-${liveId}`;
        socket.leave(roomName);

        const room = videoNamespace.adapter.rooms.get(roomName);
        const viewerCount = room?.size || 0;

        logger.info(
          `🔴 [Videos] ${email} a quitté le live ${liveId} (${viewerCount} spectateurs restants)`
        );

        // Notifier du nouveau compte de spectateurs
        videoNamespace.to(roomName).emit("updateViewers", {
          liveId,
          viewerCount,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        logger.error(`❌ [Videos] Erreur leaveLiveRoom:`, err.message);
      }
    });

    // ========================================
    // ÉVÉNEMENT: LIKE VIDEO
    // ========================================
    socket.on("likeVideo", ({ videoId }) => {
      try {
        if (!videoId) {
          logger.warn(`⚠️ [Videos] likeVideo sans videoId de ${email}`);
          return;
        }

        const roomName = `video-${videoId}`;

        videoNamespace.to(roomName).emit("videoLiked", {
          videoId,
          userId: id,
          email,
          username,
          timestamp: new Date().toISOString(),
        });

        logger.debug(`❤️ [Videos] ${email} a aimé la vidéo ${videoId}`);
      } catch (err) {
        logger.error(`❌ [Videos] Erreur likeVideo:`, err.message);
      }
    });

    // ========================================
    // ÉVÉNEMENT: COMMENT VIDEO
    // ========================================
    socket.on("commentVideo", ({ videoId, comment, commentId }) => {
      try {
        if (!videoId || !comment) {
          logger.warn(`⚠️ [Videos] commentVideo invalide de ${email}`);
          socket.emit("error", { message: "videoId et commentaire requis" });
          return;
        }

        const roomName = `video-${videoId}`;

        videoNamespace.to(roomName).emit("commentAdded", {
          videoId,
          commentId: commentId || `comment-${Date.now()}`,
          userId: id,
          email,
          username,
          comment,
          timestamp: new Date().toISOString(),
        });

        logger.debug(`💬 [Videos] ${email} a commenté la vidéo ${videoId}`);
      } catch (err) {
        logger.error(`❌ [Videos] Erreur commentVideo:`, err.message);
      }
    });

    // ========================================
    // ÉVÉNEMENT: START LIVE
    // ========================================
    socket.on("startLive", (liveData) => {
      try {
        if (!liveData?.liveId) {
          logger.warn(`⚠️ [Videos] startLive sans liveId de ${email}`);
          socket.emit("error", { message: "liveId requis" });
          return;
        }

        const liveEvent = {
          liveId: liveData.liveId,
          title: liveData.title || "Sans titre",
          userId: id,
          email,
          username,
          startedAt: new Date().toISOString(),
          thumbnail: liveData.thumbnail || null,
          category: liveData.category || "général",
        };

        // Notifier tous les clients
        videoNamespace.emit("newLive", liveEvent);

        logger.info(`🔴 [Videos] ${email} a démarré le live ${liveData.liveId}`);
      } catch (err) {
        logger.error(`❌ [Videos] Erreur startLive:`, err.message);
        socket.emit("error", { message: err.message });
      }
    });

    // ========================================
    // ÉVÉNEMENT: END LIVE
    // ========================================
    socket.on("endLive", (liveId) => {
      try {
        if (!liveId) {
          logger.warn(`⚠️ [Videos] endLive sans liveId de ${email}`);
          socket.emit("error", { message: "liveId requis" });
          return;
        }

        const roomName = `live-${liveId}`;

        videoNamespace.to(roomName).emit("liveEnded", {
          liveId,
          endedAt: new Date().toISOString(),
        });

        logger.info(`⏹️ [Videos] ${email} a terminé le live ${liveId}`);
      } catch (err) {
        logger.error(`❌ [Videos] Erreur endLive:`, err.message);
      }
    });

    // ========================================
    // ÉVÉNEMENT: DISCONNECT
    // ========================================
    socket.on("disconnect", (reason) => {
      logger.info(
        `❌ [Videos] ${email} déconnecté (${socket.id}) - Raison: ${reason}`
      );

      try {
        // Notifier les rooms que l'utilisateur s'est déconnecté
        socket.rooms.forEach((room) => {
          if (room !== socket.id) {
            videoNamespace.to(room).emit("userDisconnected", {
              userId: id,
              email,
              username,
              reason,
              timestamp: new Date().toISOString(),
            });
          }
        });
      } catch (err) {
        logger.error(`❌ [Videos] Erreur dans disconnect:`, err.message);
      }
    });

    // ========================================
    // ÉVÉNEMENT: ERROR
    // ========================================
    socket.on("error", (error) => {
      logger.error(`❌ [Videos] Erreur socket pour ${email}:`, error);
    });
  });

  logger.info("✅ Namespace /videos initialisé avec authentification");
  return videoNamespace;
};

export default initializeSocket;