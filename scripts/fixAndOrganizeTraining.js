import fs from "fs";
import path from "path";

const TRAINING_FILE = path.join(process.cwd(), "localTraining.json");
const CLEAN_FILE = path.join(process.cwd(), "localTraining_clean.json");

// 1️⃣ Vérifier si le fichier existe
if (!fs.existsSync(TRAINING_FILE)) {
  console.error("❌ Fichier localTraining.json introuvable !");
  process.exit(1);
}

// 2️⃣ Charger et nettoyer le contenu
let raw = fs.readFileSync(TRAINING_FILE, "utf-8");

// Supprimer les retours chariots étranges ou caractères invisibles
raw = raw.replace(/[\u0000-\u001F\u007F]/g, "");

// Tenter de parser
let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  console.warn("⚠️ JSON invalide, tentative de nettoyage automatique...");

  // Nettoyage ligne par ligne
  const lines = raw.split(/\r?\n/);
  const cleanLines = [];
  let buffer = "";
  let openBraces = 0;

  for (let line of lines) {
    line = line.trim();
    for (let char of line) {
      if (char === "{") openBraces++;
      if (char === "}") openBraces--;
    }
    buffer += line;
    if (openBraces === 0 && buffer.length > 0) {
      // Ajouter une virgule si manquante
      if (!buffer.endsWith("}") && !buffer.endsWith("},")) buffer += ",";
      cleanLines.push(buffer);
      buffer = "";
    } else {
      buffer += " ";
    }
  }

  // Créer un tableau JSON
  const finalJSON = "[" + cleanLines.join("\n") + "]";
  try {
    data = JSON.parse(finalJSON);
    console.log("✅ JSON nettoyé avec succès !");
  } catch (err2) {
    console.error("❌ Impossible de nettoyer automatiquement :", err2.message);
    process.exit(1);
  }
}

// 3️⃣ Supprimer doublons (même keyword + response)
const seen = new Set();
const uniqueData = data.filter(item => {
  const key = `${item.keyword}|${item.response}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// 4️⃣ Sauvegarder
fs.writeFileSync(CLEAN_FILE, JSON.stringify(uniqueData, null, 2), "utf-8");
console.log(`✅ Fichier nettoyé et organisé sauvegardé dans ${CLEAN_FILE}`);
