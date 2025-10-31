// backend/sockets/initializeSocket.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    // ✅ Configuration importante
    pingTimeout: 60000, // 60 secondes
    pingInterval: 25000, // 25 secondes
    upgradeTimeout: 30000, // 30 secondes
    allowEIO3: true,
  });

  const liveRooms = new Map();
  const videoRooms = new Map();

  // ✅ Middleware d'authentification
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error("Token manquant"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      return next(new Error("Token invalide"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`✅ Utilisateur connecté: ${socket.id} (User: ${socket.userId})`);

    // ====== LIVE ======
    socket.on("joinLiveRoom", (liveId) => {
      socket.join(`live-${liveId}`);
      if (!liveRooms.has(liveId)) liveRooms.set(liveId, new Set());
      liveRooms.get(liveId).add(socket.id);

      io.to(`live-${liveId}`).emit("updateViewers", liveRooms.get(liveId).size);
      console.log(`👤 User ${socket.id} rejoint live ${liveId}`);
    });

    socket.on("leaveLiveRoom", (liveId) => {
      socket.leave(`live-${liveId}`);
      const room = liveRooms.get(liveId);
      if (room) {
        room.delete(socket.id);
        io.to(`live-${liveId}`).emit("updateViewers", room.size);
      }
      console.log(`👋 User ${socket.id} quitte live ${liveId}`);
    });

    socket.on("startLive", (liveData) => {
      liveRooms.set(liveData.liveId, new Set());
      io.emit("newLive", liveData);
      console.log(`🔴 Nouveau live démarré: ${liveData.liveId}`);
    });

    socket.on("endLive", (liveId) => {
      io.to(`live-${liveId}`).emit("liveEnded", { liveId });
      liveRooms.delete(liveId);
      console.log(`⏹️ Live terminé: ${liveId}`);
    });

    // ====== VIDEO ======
    socket.on("joinVideoRoom", (videoId) => {
      socket.join(`video-${videoId}`);
      if (!videoRooms.has(videoId)) videoRooms.set(videoId, new Set());
      videoRooms.get(videoId).add(socket.id);
    });

    socket.on("leaveVideoRoom", (videoId) => {
      socket.leave(`video-${videoId}`);
      videoRooms.get(videoId)?.delete(socket.id);
    });

    socket.on("likeVideo", ({ videoId, userId }) => {
      io.to(`video-${videoId}`).emit("likeVideo", { videoId, userId });
    });

    socket.on("commentVideo", ({ videoId, comment }) => {
      io.to(`video-${videoId}`).emit("commentAdded", comment);
    });

    // ====== DÉCONNEXION ======
    socket.on("disconnect", (reason) => {
      console.log(`❌ Utilisateur déconnecté: ${socket.id} (Raison: ${reason})`);

      // Nettoyer liveRooms
      liveRooms.forEach((sockets, liveId) => {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          io.to(`live-${liveId}`).emit("updateViewers", sockets.size);
        }
      });

      // Nettoyer videoRooms
      videoRooms.forEach((sockets, videoId) => {
        sockets.delete(socket.id);
      });
    });
  });

  console.log("✅ Socket vidéo initialisé");
  return io;
};

export default initializeSocket;