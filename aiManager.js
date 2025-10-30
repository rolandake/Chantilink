// backend/aiManager.js
const axios = require("axios");

// Variables et constantes
const USER_ID = "user123"; // Tu peux le rendre dynamique si nécessaire
const API_URL = "http://localhost:5000";
const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY";  // Mets ta clé API ici

// Tableau pour stocker les données d'interaction
let trainingData = [];

// Fonction pour générer un prompt d'entraînement
function generatePrompt(messages) {
  let prompt = "Voici les messages échangés entre l'utilisateur et l'IA dans un projet de BTP :\n\n";

  messages.forEach(msg => {
    prompt += `${msg.role === 'user' ? 'Utilisateur' : 'IA'} : ${msg.content}\n`;
  });

  prompt += "\nRéponse de l'IA :";
  return prompt;
}

// Fonction pour envoyer l'entraînement à OpenAI
async function trainAI(messages) {
  const model = "text-davinci-003";  // Ou modèle plus spécifique si nécessaire
  
  try {
    const res = await axios.post("https://api.openai.com/v1/completions", {
      model,
      prompt: generatePrompt(messages),
      max_tokens: 200,
      temperature: 0.7,
    }, {
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
    });

    return res.data.choices[0].text.trim();  // Retourner la réponse de l'IA
  } catch (err) {
    console.error("Erreur d'entraînement IA :", err);
    return "L'IA n'a pas pu répondre.";
  }
}

// Fonction pour enregistrer l'interaction et appeler l'IA si besoin
async function handleInteraction(message, role) {
  trainingData.push({ role, content: message });

  // Si nous avons plus de 5 messages, on lance l'entraînement
  if (trainingData.length >= 5) {
    const aiResponse = await trainAI(trainingData);
    trainingData = [];  // Réinitialiser pour la prochaine session d'entraînement
    return aiResponse;
  }

  return null;  // Pas encore assez de données pour entraîner
}

module.exports = { handleInteraction };
