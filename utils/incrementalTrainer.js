// incrementalTrainer.js
import fs from "fs";
import path from "path";

// Chemin du fichier de mémoire
const MEMORY_FILE = path.resolve("./memory.json");

// Charger la mémoire depuis le fichier, ou créer un tableau vide si le fichier n'existe pas
let memory = [];
try {
  if (fs.existsSync(MEMORY_FILE)) {
    const data = fs.readFileSync(MEMORY_FILE, "utf-8");
    memory = JSON.parse(data);
    console.log("✅ Mémoire locale chargée :", memory.length, "interactions");
  }
} catch (err) {
  console.warn("⚠️ Impossible de charger la mémoire :", err.message);
}

/**
 * Sauvegarde la mémoire dans le fichier JSON
 */
function saveMemory() {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), "utf-8");
    console.log("💾 Mémoire locale sauvegardée");
  } catch (err) {
    console.error("❌ Erreur lors de la sauvegarde de la mémoire :", err.message);
  }
}

/**
 * Ajoute une interaction (question + réponse) à la mémoire locale
 * @param {string} message - Message utilisateur
 * @param {string} response - Réponse générée
 */
export function addInteractionToMemory(message, response) {
  memory.push({ message, response, timestamp: new Date().toISOString() });
  saveMemory();
}

/**
 * Récupère toutes les interactions stockées
 */
export function getMemory() {
  return memory;
}
