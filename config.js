// backend/config.js
// ⚠️ CRITIQUE: Charger .env ICI car les imports ES6 sont hoistés
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ Charger .env DANS config.js (solution définitive)
const envPath = join(__dirname, ".env");
dotenv.config({ path: envPath });

console.log("🔧 [config.js] Chargement .env depuis:", envPath);
console.log("🔧 [config.js] JWT_SECRET:", process.env.JWT_SECRET ? `✓ (${process.env.JWT_SECRET.length} car.)` : "✗ MANQUANT");

// ============================================
// 🔐 JWT Configuration
// ============================================
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_SECRET;

// Vérifications critiques
if (!JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET manquant dans .env");
  console.error("📂 Chemin .env:", envPath);
  console.error("📋 Exécutez: node verify-setup.js");
  process.exit(1);
}

if (!JWT_REFRESH_SECRET) {
  console.error("❌ FATAL: JWT_REFRESH_SECRET manquant dans .env");
  console.error("📂 Chemin .env:", envPath);
  process.exit(1);
}

// ============================================
// 🗄️ Database Configuration
// ============================================
export const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/chantilink";

// ============================================
// 🌐 Server Configuration
// ============================================
export const NODE_ENV = process.env.NODE_ENV || "development";
export const PORT = parseInt(process.env.PORT || "5000", 10);
export const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ============================================
// 🔒 CORS Configuration
// ============================================
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(origin => origin.trim())
  : [CLIENT_URL, "http://localhost:3000", "http://localhost:5173"];

// Alias pour compatibilité
export const FRONTEND_URLS = ALLOWED_ORIGINS;

// ============================================
// 🔔 Discord Webhook (optionnel)
// ============================================
export const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK || null;

// ============================================
// 📧 Email Configuration (optionnel)
// ============================================
export const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587", 10),
  user: process.env.EMAIL_USER || null,
  password: process.env.EMAIL_PASSWORD || null,
};

// ============================================
// ☁️ Cloudinary Configuration (optionnel)
// ============================================
export const CLOUDINARY_CONFIG = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
  apiKey: process.env.CLOUDINARY_API_KEY || null,
  apiSecret: process.env.CLOUDINARY_API_SECRET || null,
};

// ============================================
// 📊 Logging
// ============================================
export const LOG_LEVEL = process.env.LOG_LEVEL || "info";

// ============================================
// 🎯 Export de la configuration complète
// ============================================
export const config = {
  jwt: {
    secret: JWT_SECRET,
    refreshSecret: JWT_REFRESH_SECRET,
  },
  database: {
    uri: MONGODB_URI,
  },
  server: {
    env: NODE_ENV,
    port: PORT,
    clientUrl: CLIENT_URL,
  },
  cors: {
    origins: ALLOWED_ORIGINS,
    frontendUrls: FRONTEND_URLS,
  },
  discord: {
    webhook: DISCORD_WEBHOOK,
  },
  email: EMAIL_CONFIG,
  cloudinary: CLOUDINARY_CONFIG,
  logging: {
    level: LOG_LEVEL,
  },
};

// ============================================
// 🔍 Log de vérification au démarrage
// ============================================
console.log("✅ Configuration chargée:");
console.log(`   - Environment: ${NODE_ENV}`);
console.log(`   - Port: ${PORT}`);
console.log(`   - JWT Secret: ✓ (${JWT_SECRET.length} caractères)`);
console.log(`   - JWT Refresh Secret: ✓ (${JWT_REFRESH_SECRET.length} caractères)`);
console.log(`   - MongoDB URI: ${MONGODB_URI ? "✓" : "✗"}`);
console.log(`   - CORS Origins: ${ALLOWED_ORIGINS.join(", ")}`);
console.log(`   - Discord Webhook: ${DISCORD_WEBHOOK ? "✓" : "✗ (optionnel)"}`);

export default config;