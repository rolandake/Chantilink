// src/config/openai.js
import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

// Vérification de la clé API
if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "La clé API OpenAI est manquante dans les variables d'environnement."
  );
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Optionnel : log pour confirmer la config (à retirer en production)
console.log("✅ OpenAI configuré avec succès.");

export default openai;
