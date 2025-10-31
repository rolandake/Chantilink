// utils/aiSocketHandler.js
import { handleLocalProject } from "../utils/localAIHandler.js";
import LocalChat from "../models/LocalChat.js";
import { AI_CONFIG, SYSTEM_PROMPT } from "../aiConfig.js";

// Fonction pour gérer une nouvelle requête utilisateur
export async function handleUserMessage({ socket, userId, message, replyId, io, openai }) {
  // 1️⃣ Ajouter message utilisateur à MongoDB
  await LocalChat.findOneAndUpdate(
    { userId },
    { $push: { messages: { role: "user", content: message } } },
    { upsert: true }
  );

  // 2️⃣ Envoyer état "typing" au front
  io.to(userId).emit("receiveGPTMessage", {
    replyId,
    role: "assistant",
    content: "",
    typing: true,
  });

  let openaiResp = null;

  // 3️⃣ Essayer OpenAI
  try {
    if (openai) {
      const resp = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message }
        ],
        temperature: AI_CONFIG.temperature,
      });
      openaiResp = resp.choices[0].message.content;
    }
  } catch (err) {
    console.warn("⚠️ OpenAI indisponible, fallback local...");
  }

  // 4️⃣ Générer réponse locale (hybride)
  const localReply = await handleLocalProject({
    history: [{ role: "user", content: message }],
    planSummary: "",
    projectType: "generic",
    values: {},
    openAIResp: openaiResp
  });

  // 5️⃣ Envoyer réponse au front
  io.to(userId).emit("receiveGPTMessage", {
    replyId,
    role: "assistant",
    content: localReply.response,
    typing: false,
  });

  // 6️⃣ Sauvegarder réponse IA dans MongoDB
  await LocalChat.findOneAndUpdate(
    { userId },
    { $push: { messages: { role: "ai", content: localReply.response } } },
    { upsert: true }
  );
}
