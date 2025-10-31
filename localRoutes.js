// backend/localRoutes.js - VERSION CORRIGÉE SANS localAIRoutes
import contactsRoutes from "./routes/contactsRoutes.js";
import postsRouter from "./routes/posts.js";
import initializeSocket from "./sockets/visionSocket.js";
import { protectSocketNamespaces as setupSocketAuthentication, verifySocketToken } from "./sockets/socketAuth.js";
import { SYSTEM_PROMPT, AI_CONFIG } from "./aiConfig.js";
import { OpenAI } from "./modules.js";

let openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

if (!openai) console.warn("⚠️ Pas de clé OpenAI, mode IA locale");

// --- File d'attente des requêtes GPT hybrides ---
const requestQueue = [];
let processing = false;

const processQueue = async () => {
  if (processing || requestQueue.length === 0) return;
  processing = true;

  const { socket, message, replyId, file, userContext } = requestQueue.shift();
  
  console.log("🔄 [GPT Queue] Traitement message:", {
    replyId,
    messageLength: message?.length,
    hasFile: !!file,
    user: userContext?.fullName
  });

  socket.emit("receiveGPTMessage", {
    replyId,
    role: "assistant",
    content: "",
    typing: true,
  });

  let openaiResp = null;

  if (openai) {
    try {
      let enrichedMessage = message;
      
      if (userContext) {
        const contextInfo = [];
        if (userContext.fullName) contextInfo.push(`Nom: ${userContext.fullName}`);
        if (userContext.email) contextInfo.push(`Email: ${userContext.email}`);
        if (userContext.role) contextInfo.push(`Rôle: ${userContext.role}`);
        if (userContext.isPremium) contextInfo.push("🌟 Compte Premium");
        if (userContext.location) contextInfo.push(`Localisation: ${userContext.location}`);
        if (userContext.bio) contextInfo.push(`Bio: ${userContext.bio}`);
        
        if (contextInfo.length > 0) {
          enrichedMessage = `[Contexte utilisateur]\n${contextInfo.join('\n')}\n\n[Question]\n${message}`;
        }
      }

      console.log("📤 [GPT] Envoi à OpenAI:", {
        model: AI_CONFIG.model,
        messageLength: enrichedMessage.length,
        hasContext: !!userContext
      });

      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: enrichedMessage },
        ],
        temperature: AI_CONFIG.temperature,
      });

      openaiResp = completion.choices[0].message.content;
      
      console.log("✅ [GPT] Réponse reçue:", {
        replyId,
        responseLength: openaiResp.length
      });

      socket.emit("receiveGPTMessage", {
        replyId,
        role: "assistant",
        content: openaiResp,
        typing: false,
      });
    } catch (err) {
      console.error("❌ [GPT] Erreur OpenAI:", err.message);
      socket.emit("receiveGPTMessage", {
        replyId,
        role: "assistant",
        content: "Le service OpenAI est temporairement indisponible. Réessaye plus tard.",
        typing: false,
      });
    }
  } else {
    console.warn("⚠️ [GPT] Pas de clé OpenAI, réponse de fallback");
    socket.emit("receiveGPTMessage", {
      replyId,
      role: "assistant",
      content: `Bonjour ${userContext?.fullName || 'utilisateur'} ! Je suis l'assistant IA du BTP. La clé OpenAI n'est pas configurée sur le serveur.`,
      typing: false,
    });
  }

  processing = false;
  processQueue();
};

// --- Socket GPT hybride avec support userContext ---
const initGptSocket = (io, authenticateSocket = null) => {
  const gptNamespace = io.of("/gpt");
  
  if (authenticateSocket) {
    gptNamespace.use(authenticateSocket);
    console.log("✅ [GPT] Middleware d'authentification appliqué");
  } else {
    console.warn("⚠️ [GPT] Pas de middleware d'authentification fourni");
  }
  
  gptNamespace.on("connection", (socket) => {
    const user = socket.data?.user;
    
    if (!user) {
      console.error("❌ [GPT] Pas de données utilisateur");
      socket.disconnect(true);
      return;
    }

    console.log(`🟢 [GPT] ${user.email} connecté: ${socket.id}`);
    console.log(`👤 [GPT] Données utilisateur:`, {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isPremium: user.isPremium
    });

    socket.on("sendGPTMessage", async ({ message, replyId, file, fileName, fileType, userContext }) => {
      if (!message && !file) return;
      
      let finalMessage = message;
      if (file) {
        if (fileType?.startsWith('image/')) {
          finalMessage = `${message}\n\n[Note: L'utilisateur a envoyé une image "${fileName}". Analyse non implémentée.]`;
        } else if (fileType?.startsWith('audio/')) {
          finalMessage = `${message}\n\n[Note: L'utilisateur a envoyé un fichier audio. Transcription non implémentée.]`;
        }
      }

      requestQueue.push({ socket, message: finalMessage, replyId, file, userContext });
      processQueue();
    });

    socket.on("disconnect", () =>
      console.log(`🔴 [GPT] ${user.email} déconnecté: ${socket.id}`)
    );
  });
  
  console.log("✅ [GPT] Socket namespace /gpt initialisé avec support userContext");
};

// --- Analyse plan hybride (non encore implémentée) ---
const handleAnalyzePlan = async (req, res) => {
  return res.status(501).json({ error: "Analyse plan non implémentée" });
};

// --- Export des routes et fonctions locales ---
export const localRoutes = {
  contactsRoutes,
  postsRouter,
  initVisionSocket: initializeSocket,
  verifySocketToken,
  handleAnalyzePlan,
  initGptSocket,
};
