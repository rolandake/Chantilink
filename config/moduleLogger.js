// backend/config/moduleLogger.js
import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info");

let logger;

// Configuration pour le développement (avec pino-pretty)
if (isDevelopment) {
  logger = pino(
    pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
        singleLine: false,
        messageFormat: "{levelLabel} - {msg}",
      },
    }),
    {
      level: logLevel,
    }
  );
} else {
  // Configuration pour la production (JSON structuré)
  logger = pino({
    level: logLevel,
    formatters: {
      level: (label) => ({ level: label.toUpperCase() }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        host: bindings.hostname,
        node_version: process.version,
      }),
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        path: req.path,
        parameters: req.params,
        headers: {
          host: req.headers.host,
          "user-agent": req.headers["user-agent"],
          "content-type": req.headers["content-type"],
        },
      }),
      res: (res) => ({ statusCode: res.statusCode }),
      err: pino.stdSerializers.err,
    },
  });
}

// Helpers de logging
export const logInfo = (msg, data = {}) => logger.info({ ...data }, msg);
export const logError = (msg, error = {}, data = {}) =>
  logger.error({ err: error, ...data }, msg);
export const logWarn = (msg, data = {}) => logger.warn({ ...data }, msg);
export const logDebug = (msg, data = {}) => logger.debug({ ...data }, msg);
export const logFatal = (msg, data = {}) => logger.fatal({ ...data }, msg);

// Middleware Express pour logger les requêtes HTTP
export const httpLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const level =
      res.statusCode >= 500
        ? "error"
        : res.statusCode >= 400
        ? "warn"
        : "info";

    logger[level](
      {
        req: { method: req.method, url: req.url, headers: req.headers },
        res: { statusCode: res.statusCode },
        duration: `${duration}ms`,
        userId: req.user?.id || "anonymous",
      },
      `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`
    );
  });

  next();
};

// Logger pour les erreurs non capturées
process.on("uncaughtException", (error) => {
  logFatal("Uncaught Exception", { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logFatal("Unhandled Rejection", { reason, promise });
  process.exit(1);
});

export default logger;
