//========================================
// backend/server.js - VERSION COMPLÈTE AVEC /gpt ET /vision
// ========================================
import "./config.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import axios from "axios";
import jwt from "jsonwebtoken";

// Modules internes
import * as modules from "./modules.js";
import * as routes from "./routesIndex.js";
import devRoutes from "./routes/devRoutes.js";
import engineeringRoutes from "./routes/engineeringRoutes.js";
import * as monitoring from "./monitoring.js";
import adminRoutes from "./routes/adminRoutes.js";
import uploadMessagesRoutes from "./routes/uploadMessages.js";
import calculationRoutes from "./routes/calculations.js";

// Sockets
import { registerEngineeringSocket } from "./sockets/engineeringSocket.js";
import { registerStorySocket } from "./sockets/storySocket.js";
import { registerMessageSocket } from "./sockets/messageSocket.js";
import { initializeSocket } from "./sockets/videosocket.js";
import { registerChatIASocket } from "./sockets/chatIASocket.js";
import { registerVisionSocket as registerVisionIASocket } from "./sockets/visionIASocket.js";

// Utils
import { scheduleStoryCleanup } from "./utils/storyCleanup.js";

// Config
import { PORT, MONGODB_URI, FRONTEND_URLS, DISCORD_WEBHOOK } from "./config.js";
import { verifyToken, verifyTokenAdmin } from "./middleware/auth.js";
import User from "./models/User.js";

// ========================================
// INITIALISATION
// ========================================
const { express, mongoose, http, SocketServer, cors } = modules;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// DEBUG IMPORTS
// ========================================
console.log('🔍 Vérification des imports:', {
  adminRoutes: typeof adminRoutes,
  engineeringRoutes: typeof engineeringRoutes,
  devRoutes: typeof devRoutes,
  uploadMessagesRoutes: typeof uploadMessagesRoutes,
  calculationRoutes: typeof calculationRoutes,
  registerChatIASocket: typeof registerChatIASocket,
  registerVisionIASocket: typeof registerVisionIASocket,
});

// ========================================
// CRÉATION DES DOSSIERS
// ========================================
[
  "logs",
  "uploads",
  "uploads/images",
  "uploads/videos",
  "uploads/posts",
  "uploads/users",
  "uploads/engineering",
  "uploads/stories",
  "uploads/messages",
  "uploads/backup",
  "uploads/temp",
  "exports",
].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ========================================
// LOGGER Pino
// ========================================
const logger = pino({
  transport: {
    targets: [
      { 
        target: "pino-pretty", 
        level: "info", 
        options: { colorize: true, translateTime: "HH:MM:ss" } 
      },
      { target: "pino/file", level: "info", options: { destination: "logs/info.log", mkdir: true } },
      { target: "pino/file", level: "error", options: { destination: "logs/error.log", mkdir: true } },
    ],
  },
});

// ========================================
// MIDDLEWARES GLOBAUX
// ========================================
app.use(
  helmet({ 
    crossOriginResourcePolicy: { policy: "cross-origin" }, 
    contentSecurityPolicy: false 
  })
);

app.use(cookieParser());

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || FRONTEND_URLS.includes(origin)) return callback(null, true);
      logger.warn(`CORS bloqué pour origine: ${origin}`);
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "Cache-Control",
      "X-Requested-With",
      "Pragma"
    ],
    exposedHeaders: ["Content-Disposition"]
  })
);

app.options("*", cors());

// ========================================
// PARSEURS JSON/URLENCODED
// ========================================
app.use(express.json({ limit: "200mb", strict: true }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

// ========================================
// DEBUG MIDDLEWARE
// ========================================
app.use((req, res, next) => {
  if (req.path.includes("/calcul")) {
    console.log("\n========== DEBUG CALCULS REQUEST ==========");
    console.log("🔗 Path:", req.path);
    console.log("📋 Method:", req.method);
    console.log("🎯 Headers Content-Type:", req.get("content-type"));
    console.log("📦 Body:", JSON.stringify(req.body, null, 2));
    console.log("👤 User:", req.user?.email || "Non authentifié");
    console.log("==========================================\n");
  }
  next();
});

// ========================================
// STATIC FILES
// ========================================
app.use(
  "/uploads", 
  express.static(path.join(process.cwd(), "uploads"), {
    setHeaders: (res) => {
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
      res.set("Access-Control-Allow-Origin", "*");
    },
  })
);

app.use(
  "/exports", 
  express.static(path.join(process.cwd(), "exports"), {
    setHeaders: (res) => {
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
      res.set("Access-Control-Allow-Origin", "*");
    },
  })
);

app.use(pinoHttp({ logger }));
app.use(monitoring.requestStats);

// ========================================
// NOTIFICATION ERREUR CRITIQUE
// ========================================
async function notifyCriticalError(title, error) {
  if (!DISCORD_WEBHOOK) return;
  try {
    await axios.post(DISCORD_WEBHOOK, {
      content: `🚨 **${title}**\n\`\`\`\n${error.message || error}\n\`\`\``,
    });
  } catch (err) {
    logger.error("Erreur lors de l'envoi de notification Discord:", err);
  }
}

// ========================================
// MONGODB CONNECTION
// ========================================
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    logger.info("✅ MongoDB connecté");
    scheduleStoryCleanup(logger);
  })
  .catch((err) => {
    logger.error("❌ Erreur MongoDB :", err);
    notifyCriticalError("Erreur MongoDB critique", err);
    process.exit(1);
  });

// ========================================
// ROUTES PUBLIQUES
// ========================================
app.use("/api/auth", routes.authRoutes);
app.use("/api/posts", routes.postsRoutes);
app.use("/api/users", routes.userRoutes);

// ========================================
// ROUTE PROFIL (Legacy)
// ========================================
app.put("/api/users/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, username, bio, location, website } = req.body;
    if (req.user.id !== id) return res.status(403).json({ error: "Action non autorisée" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    user.fullName = fullName || user.fullName;
    user.username = username || user.username;
    user.bio = bio || user.bio;
    user.location = location || user.location;
    user.website = website || user.website;

    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: "Erreur serveur lors de la mise à jour du profil" });
  }
});

// ========================================
// ROUTES PROTÉGÉES
// ========================================
app.use("/api/follow", verifyToken, routes.followRoutes);
app.use("/api/story", verifyToken, routes.storyRoutes);
app.use("/api/messages", verifyToken, routes.messagesRoutes);
app.use("/api/devis", verifyToken, routes.devisRoutes);
app.use("/api/engineering", verifyToken, engineeringRoutes);
app.use("/api/videos", routes.videosRoutes);
app.use("/api/upload/message", verifyToken, uploadMessagesRoutes);

// ========================================
// ROUTE CALCULS
// ========================================
if (calculationRoutes) {
  app.use("/api/calculs", verifyToken, calculationRoutes);
  console.log("✅ Route /api/calculs montée avec succès");
} else {
  console.error("❌ calculationRoutes est undefined");
}

// ========================================
// ROUTES DEV
// ========================================
if (devRoutes) {
  app.use("/api/dev", devRoutes);
  console.log("✅ Route /api/dev montée");
} else {
  console.warn("⚠️ devRoutes est undefined");
}

// ========================================
// ROUTES ADMIN
// ========================================
if (adminRoutes) {
  app.use("/api/admin", verifyTokenAdmin, adminRoutes);
  console.log("✅ Route /api/admin montée");
} else {
  console.warn("⚠️ adminRoutes est undefined");
}

// ========================================
// HEALTHCHECK
// ========================================
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(), 
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    env: process.env.NODE_ENV || "development",
    port: PORT,
  });
});

// ========================================
// TEST ROUTE CALCULS
// ========================================
app.get("/api/calculs/test", verifyToken, (req, res) => {
  res.json({
    message: "✅ Route calculs fonctionne !",
    user: req.user.email,
    timestamp: new Date().toISOString()
  });
});

// ========================================
// SOCKET.IO SETUP
// ========================================
const httpServer = http.createServer(app);
const io = new SocketServer(httpServer, { 
  cors: { 
    origin: FRONTEND_URLS, 
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  transports: ["websocket", "polling"],
  allowEIO3: true
});

app.set("io", io);

// ========================================
// HELPER: Extraire token
// ========================================
function extractToken(socket) {
  if (socket.handshake.auth?.token) {
    return socket.handshake.auth.token;
  }

  const authHeader = socket.handshake.headers?.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  const cookies = socket.handshake.headers?.cookie;
  if (cookies) {
    const match = cookies.match(/token=([^;]+)/);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

// ========================================
// MIDDLEWARE D'AUTHENTIFICATION SOCKET
// ========================================
logger.info("🔐 Configuration du middleware d'authentification Socket.IO...");

io.use(async (socket, next) => {
  try {
    const token = extractToken(socket);

    if (!token) {
      return next(new Error("MISSING_TOKEN"));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        ignoreExpiration: false,
      });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(new Error("TOKEN_EXPIRED"));
      }
      return next(new Error("INVALID_TOKEN"));
    }

    const user = await User.findById(decoded.id).select(
      "_id email fullName role isVerified isPremium isBanned"
    );

    if (!user) {
      return next(new Error("USER_NOT_FOUND"));
    }

    if (user.isBanned) {
      return next(new Error("ACCOUNT_BANNED"));
    }

    await User.findByIdAndUpdate(user._id, {
      isOnline: true,
      lastSeen: new Date(),
    });

    socket.data = socket.data || {};
    socket.data.user = {
      id: user._id.toString(),
      email: user.email,
      username: user.fullName || user.email,
      fullName: user.fullName,
      role: user.role || "user",
      isVerified: user.isVerified || false,
      isPremium: user.isPremium || false,
    };
    socket.data.token = token;

    logger.info(
      `✅ Socket Auth: ${socket.data.user.email} - Namespace: ${socket.nsp.name}`
    );

    next();
  } catch (err) {
    logger.error(`❌ Socket Auth Error: ${err.message}`);
    next(new Error("AUTH_ERROR"));
  }
});

// ========================================
// NAMESPACES SOCKET.IO
// ========================================
logger.info("🔌 Création des namespaces Socket.IO...");

// Engineering Socket
try {
  registerEngineeringSocket(io);
  logger.info("✅ Engineering Socket créé");
} catch (e) {
  logger.error("❌ Engineering Socket error:", e.message);
}

// 🔥 Chat IA Socket (namespace /gpt pour ChatPage)
try {
  registerChatIASocket(io);
  logger.info("✅ Chat IA Socket créé (/gpt)");
} catch (e) {
  logger.error("❌ Chat IA Socket error:", e.message);
}

// Story Socket
try {
  registerStorySocket(io);
  logger.info("✅ Story Socket créé");
} catch (e) {
  logger.error("❌ Story Socket error:", e.message);
}

// Message Socket
try {
  registerMessageSocket(io, logger);
  logger.info("✅ Message Socket créé");
} catch (e) {
  logger.error("❌ Message Socket error:", e.message);
}

// Video Socket
try {
  initializeSocket(io);
  logger.info("✅ Video Socket créé");
} catch (e) {
  logger.error("❌ Video Socket error:", e.message);
}

// 🔥 Vision IA Socket (namespace /vision pour VisionPage)
try {
  registerVisionIASocket(io);
  logger.info("✅ Vision IA Socket créé (/vision)");
} catch (e) {
  logger.error("❌ Vision IA Socket error:", e.message);
}

const namespaces = Array.from(io._nsps.keys());
logger.info("📋 Namespaces enregistrés:", namespaces.join(", "));

// ========================================
// HANDLER DE DÉCONNEXION GLOBAL
// ========================================
io.on("connection", (socket) => {
  logger.info(`🔌 Nouvelle connexion: ${socket.id} - Namespace: ${socket.nsp.name}`);
  
  socket.on("disconnect", async (reason) => {
    logger.info(`👋 Déconnexion: ${socket.id} - Raison: ${reason}`);
    
    if (socket.data?.user?.id) {
      try {
        await User.findByIdAndUpdate(socket.data.user.id, {
          isOnline: false,
          lastSeen: new Date(),
        });
      } catch (err) {
        logger.error("❌ Erreur statut déconnexion:", err);
      }
    }
  });
});

logger.info("✅ Socket.IO configuré");

// ========================================
// 404 & ERROR HANDLERS
// ========================================
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} non trouvée` });
});

app.use((err, req, res, next) => {
  logger.error({ error: err.message, stack: err.stack });
  res.status(err.status || 500).json({ 
    error: "Erreur interne serveur", 
    details: process.env.NODE_ENV === "development" ? err.message : undefined 
  });
});

// ========================================
// SIGNAL HANDLERS
// ========================================
["SIGTERM", "SIGINT"].forEach((signal) => {
  process.on(signal, () => {
    logger.info(`🛑 ${signal} reçu, fermeture gracieuse...`);
    httpServer.close(() => {
      logger.info("✅ Serveur HTTP fermé");
      mongoose.connection.close(false, () => {
        logger.info("✅ MongoDB déconnecté");
        process.exit(0);
      });
    });
  });
});

// ========================================
// UNHANDLED ERRORS
// ========================================
process.on("uncaughtException", (err) => {
  logger.error("❌ Exception non gérée:", err);
  notifyCriticalError("Exception non gérée", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("❌ Promesse rejetée non gérée:", reason);
  notifyCriticalError("Promesse rejetée", reason);
});

// ========================================
// DÉMARRAGE DU SERVEUR
// ========================================
httpServer.listen(PORT, () => {
  logger.info("=".repeat(50));
  logger.info("🚀 Serveur backend lancé avec succès!");
  logger.info(`📍 URL: http://localhost:${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`🗄️  MongoDB: ${mongoose.connection.readyState === 1 ? "✓" : "✗"}`);
  logger.info(`🔐 JWT: ${process.env.JWT_SECRET ? "✓" : "✗"}`);
  logger.info(`🔒 CORS: ${FRONTEND_URLS.join(", ")}`);
  logger.info(`📊 Routes HTTP:`);
  logger.info(`   - /api/auth (${routes.authRoutes ? '✓' : '✗'})`);
  logger.info(`   - /api/posts (${routes.postsRoutes ? '✓' : '✗'})`);
  logger.info(`   - /api/calculs (${calculationRoutes ? '✓' : '✗'})`);
  logger.info(`   - /api/admin (${adminRoutes ? '✓' : '✗'})`);
  logger.info(`📡 Namespaces Socket.IO:`);
  namespaces.forEach(ns => {
    logger.info(`   - ${ns} ✓`);
  });
  logger.info("=".repeat(50));
});

export { io, monitoring };