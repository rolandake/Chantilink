// backend/utils/exportTrainingDataset.js
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import LocalChat from "../models/LocalChat.js";

const DATASET_FILE = path.join(process.cwd(), "trainingDataset.json");
const LOCAL_TRAINING_FILE = path.join(process.cwd(), "localTraining.json");

// --- Config MongoDB ---
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/chantilink";

// --- Lire la mémoire locale ---
let localMemory = [];
if (fs.existsSync(LOCAL_TRAINING_FILE)) {
  localMemory = JSON.parse(fs.readFileSync(LOCAL_TRAINING_FILE, "utf-8"));
}

// --- Fonction principale ---
async function exportTrainingDataset() {
  try {
    await mongoose.connect(MONGO_URI, { dbName: "chantilink" });
    console.log("✅ Connecté à MongoDB");

    const allUsers = await LocalChat.find({});
    const dataset = [];

    for (const user of allUsers) {
      const messages = user.messages || [];
      let history = [];

      for (const msg of messages) {
        history.push({ role: msg.role, content: msg.content });

        // On ajoute une entrée si AI a répondu
        if (msg.role === "ai") {
          dataset.push({
            history: [...history],
            planSummary: msg.planSummary || "",
            projectType: msg.projectType || "generic"
          });
        }
      }
    }

    // Ajouter la mémoire locale comme exemples supplémentaires
    localMemory.forEach(mem => {
      dataset.push({
        history: [{ role: "user", content: mem.keyword }],
        planSummary: "",
        projectType: "generic",
        aiResponse: mem.response
      });
    });

    // Sauvegarde finale
    fs.writeFileSync(DATASET_FILE, JSON.stringify(dataset, null, 2));
    console.log(`✅ Dataset exporté : ${DATASET_FILE} (total ${dataset.length} exemples)`);

    await mongoose.disconnect();
    console.log("✅ Déconnecté de MongoDB");
  } catch (err) {
    console.error("❌ Erreur exportTrainingDataset :", err);
  }
}

// --- Lancer l'export ---
exportTrainingDataset();
