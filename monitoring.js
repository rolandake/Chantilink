// backend/monitoring.js
import pino from "pino";
import logger from "./config/moduleLogger.js";

// Configuration du logger Pino
const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

// Middleware HTTP pour Express
export const requestStats = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`[Request] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`);
  });
  next();
};

// Middleware Pino HTTP (optionnel si tu veux loguer automatiquement toutes les requêtes)
export const httpLogger = pinoHttp({ logger });

// Fonction pour surveiller les erreurs critiques
export const monitorApp = (app) => {
  process.on("uncaughtException", (err) => {
    logger.error("❌ Erreur non gérée :", err);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("⚠️ Promesse non gérée :", reason);
  });

  logger.info("✅ Monitoring initialisé avec succès.");
};

export default logger;
