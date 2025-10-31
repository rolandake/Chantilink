// backend/sockets/chatIASocket.js - VERSION CORRIGÉE POUR RÉPONSES COMPLÈTES
import { aiManager } from "../utils/aiProviderManager.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const conversationHistories = new Map();

function getConversationHistory(roomId) {
  if (!conversationHistories.has(roomId)) {
    conversationHistories.set(roomId, []);
  }
  return conversationHistories.get(roomId);
}

function addToHistory(roomId, role, content) {
  const history = getConversationHistory(roomId);
  history.push({ role, content });
  
  if (history.length > 20) {
    conversationHistories.set(roomId, history.slice(-20));
  }
}

function clearHistory(roomId) {
  conversationHistories.delete(roomId);
  console.log(`[ChatIA] History cleared for room: ${roomId}`);
}

async function transcribeAudio(file) {
  if (!openai) {
    throw new Error("OpenAI not available for transcription");
  }

  let audioPath = null;
  
  if (Buffer.isBuffer(file)) {
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    audioPath = path.join(tempDir, `audio-${Date.now()}.webm`);
    fs.writeFileSync(audioPath, file);
    console.log(`[ChatIA] Temp file created: ${audioPath}`);
  } else if (typeof file === 'string' && fs.existsSync(file)) {
    audioPath = file;
  }

  if (audioPath && fs.existsSync(audioPath)) {
    console.log(`[ChatIA] Starting Whisper transcription...`);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
      language: "auto",
      response_format: "text",
      temperature: 0.2,
    });

    try {
      fs.unlinkSync(audioPath);
      console.log(`[ChatIA] Temp file deleted`);
    } catch (cleanErr) {
      console.warn(`[ChatIA] Could not delete ${audioPath}:`, cleanErr.message);
    }

    return transcription;
  }

  throw new Error("Invalid audio file");
}

// ========================================
// ✅ STREAMING TOKEN PAR TOKEN (effet Claude)
// ========================================
async function streamAIResponse(socket, roomId, replyId, provider, responseStream) {
  let fullResponse = "";
  let chunkCount = 0;
  let tokenBuffer = "";
  let lastEmitTime = Date.now();
  
  // ✅ PARAMÈTRES POUR EFFET "CLAUDE-LIKE"
  const EMIT_INTERVAL = 30; // 30ms entre chaque émission (fluide et rapide)
  const CHARS_PER_EMIT = 3; // 3 caractères à la fois (effet naturel)
  const FLUSH_TIMEOUT = 5000; // 5s sans token = fin forcée

  let lastTokenTime = Date.now();
  let streamComplete = false;

  // ✅ Fonction pour envoyer caractère par caractère de manière fluide
  const flushBuffer = () => {
    if (tokenBuffer.length > 0) {
      // Envoyer CHARS_PER_EMIT caractères à la fois
      const toSend = tokenBuffer.slice(0, CHARS_PER_EMIT);
      tokenBuffer = tokenBuffer.slice(CHARS_PER_EMIT);
      
      socket.emit("receiveGPTMessage", {
        replyId,
        role: "assistant",
        content: toSend,
        typing: true,
        provider,
      });
      
      lastEmitTime = Date.now();
    }
  };

  // ✅ Timer pour envoyer les caractères progressivement
  const flushInterval = setInterval(() => {
    const timeSinceLastToken = Date.now() - lastTokenTime;

    // Envoyer le buffer par petits morceaux
    if (tokenBuffer.length > 0) {
      flushBuffer();
    }

    // ✅ Détection de fin de stream (pas de token depuis 5s)
    if (timeSinceLastToken > FLUSH_TIMEOUT && !streamComplete && fullResponse.length > 0) {
      console.warn(`[Stream] ⚠️ Stream timeout detected (${FLUSH_TIMEOUT}ms sans token)`);
      streamComplete = true;
      clearInterval(flushInterval);
      
      // Envoyer tout le buffer restant
      while (tokenBuffer.length > 0) {
        flushBuffer();
      }
      
      socket.emit("receiveGPTMessage", {
        replyId,
        role: "assistant",
        content: "",
        typing: false,
        provider,
      });
    }
  }, EMIT_INTERVAL);

  try {
    if (provider === "Anthropic") {
      for await (const event of responseStream) {
        if (event.type === "content_block_delta" && event.delta?.text) {
          const token = event.delta.text;
          fullResponse += token;
          tokenBuffer += token;
          chunkCount++;
          lastTokenTime = Date.now();
        }
      }
    } else if (provider === "Gemini") {
      for await (const chunk of responseStream) {
        const token = chunk.text();
        if (token) {
          fullResponse += token;
          tokenBuffer += token;
          chunkCount++;
          lastTokenTime = Date.now();
        }
      }
    } else if (provider === "Cohere") {
      for await (const chunk of responseStream) {
        if (chunk.eventType === "text-generation") {
          const token = chunk.text;
          fullResponse += token;
          tokenBuffer += token;
          chunkCount++;
          lastTokenTime = Date.now();
        }
      }
    } else if (provider === "HuggingFace") {
      for await (const chunk of responseStream) {
        const token = chunk.choices?.[0]?.delta?.content || "";
        if (token) {
          fullResponse += token;
          tokenBuffer += token;
          chunkCount++;
          lastTokenTime = Date.now();
        }
      }
    } else {
      // OpenAI/Groq format (default)
      for await (const chunk of responseStream) {
        const token = chunk.choices[0]?.delta?.content || "";
        
        if (token) {
          fullResponse += token;
          tokenBuffer += token;
          chunkCount++;
          lastTokenTime = Date.now();
        }

        const finishReason = chunk.choices[0]?.finish_reason;
        if (finishReason) {
          console.log(`[Stream] ✅ Finish reason: ${finishReason}`);
          streamComplete = true;
        }
      }
    }

    // ✅ Stream terminé
    streamComplete = true;
    
    // ✅ Envoyer tout le buffer restant progressivement
    while (tokenBuffer.length > 0) {
      flushBuffer();
      await new Promise(resolve => setTimeout(resolve, EMIT_INTERVAL));
    }
    
    // Arrêter le timer
    clearInterval(flushInterval);

    // ✅ Petit délai pour s'assurer que tout est reçu
    await new Promise(resolve => setTimeout(resolve, 100));

    // ✅ Signal de fin
    socket.emit("receiveGPTMessage", {
      replyId,
      role: "assistant",
      content: "",
      typing: false,
      provider,
    });

    console.log(`[Stream] ✅ COMPLETE - Provider: ${provider}, Chunks: ${chunkCount}, Length: ${fullResponse.length}`);

    // ✅ Vérification de complétude
    const seemsIncomplete = fullResponse.length > 100 && (
      fullResponse.endsWith('...') ||
      /[a-zéèêàâùû]$/i.test(fullResponse.trim()) ||
      /\d+$/.test(fullResponse.trim()) ||
      fullResponse.match(/\n\s*[-*•]\s*[^.!?]*$/)
    );

    if (seemsIncomplete) {
      console.warn(`[Stream] ⚠️ Réponse possiblement incomplète détectée`);
      console.warn(`[Stream]    Derniers caractères: "${fullResponse.slice(-50)}"`);
    }

    return fullResponse;

  } catch (streamErr) {
    console.error(`[Stream] ❌ Error:`, streamErr.message);
    
    streamComplete = true;
    clearInterval(flushInterval);
    
    // Envoyer buffer restant en cas d'erreur
    while (tokenBuffer.length > 0) {
      flushBuffer();
    }
    
    socket.emit("receiveGPTMessage", {
      replyId,
      role: "assistant",
      content: "",
      typing: false,
    });

    throw streamErr;
  }
}

function buildSystemPrompt(userContext) {
  let systemPrompt = `You are an expert assistant in construction, civil engineering, and project management.

CRITICAL INSTRUCTION - Complete responses:
- You MUST ALWAYS finish your sentences completely
- NEVER stop mid-sentence, mid-word, or mid-list
- Always conclude your thoughts with proper punctuation
- If you start a list or enumeration, COMPLETE IT ENTIRELY with ALL items
- Each bullet point must be a complete sentence with proper ending
- Never end with incomplete phrases like "N'oubl...", "Assurez...", or trailing numbers

CRITICAL - Multilingual support:
- Automatically detect the user's language
- ALWAYS respond in the SAME language as the question
- If user writes in French, respond in French
- If user writes in English, respond in English
- Adapt to any language

Response structure requirements:
1. Start with a clear, complete introduction
2. Develop EACH point completely with full sentences
3. If listing items (costs, steps, etc.):
   - Write "Étape 1: Description complète."
   - Write "Étape 2: Description complète."
   - Continue until ALL items are covered
4. End with a proper conclusion or summary
5. NEVER truncate lists or leave enumerations incomplete

Response formatting:
- Use markdown formatting:
  * Bold (**text**) for important titles
  * Bullet lists with - for items (always complete)
  * No # for titles, use ** instead
- Be concise but COMPLETE - quality over brevity
- Always end with a complete sentence and proper conclusion

Technical guidelines:
- Stay within your domain expertise (construction, architecture, civil engineering)
- If question is outside your domain, politely redirect
- Be precise and technical when necessary
- Provide concrete examples when relevant

Your expertise covers:
- Construction plans and blueprint reading
- Building materials (concrete, steel, wood, etc.)
- Construction techniques and methods
- Site management and planning
- Standards and regulations (DTU, Eurocodes, etc.)
- Structural calculations
- Cost estimation and quotes
- Site safety and prevention`;

  if (userContext?.fullName) {
    systemPrompt += `\n\nUser context:\n`;
    systemPrompt += `- Name: ${userContext.fullName}\n`;
    
    if (userContext.role) {
      systemPrompt += `- Role: ${userContext.role}\n`;
    }
    
    if (userContext.isPremium) {
      systemPrompt += `- Status: Premium Member\n`;
    }
    
    if (userContext.location) {
      systemPrompt += `- Location: ${userContext.location}\n`;
    }
    
    systemPrompt += `\nPersonalized instructions:\n`;
    systemPrompt += `- Address user naturally by their first name when appropriate\n`;
    systemPrompt += `- Adapt technical level based on their role\n`;
    systemPrompt += `- Stay natural and professional\n`;
    systemPrompt += `- ALWAYS provide complete, well-structured, and fully finished responses\n`;
    
    if (userContext.isPremium) {
      systemPrompt += `- As premium member, provide in-depth analysis and expert advice\n`;
    }
  }

  return systemPrompt;
}

export function registerChatIASocket(io) {
  console.log("[ChatIA] ========================================");
  console.log("[ChatIA] DÉBUT ENREGISTREMENT NAMESPACE /gpt");
  console.log("[ChatIA] ========================================");
  
  try {
    const gptNamespace = io.of("/gpt");
    console.log("[ChatIA] ✅ Namespace créé:", gptNamespace.name);
    
    gptNamespace.on("connection", (socket) => {
      const userEmail = socket.data?.user?.email || "anonymous";
      const userId = socket.data?.user?.id || "unknown";
      
      console.log(`[ChatIA] ✅ Client connected: ${socket.id}`);
      console.log(`[ChatIA]    User: ${userEmail} (ID: ${userId})`);

      socket.on("joinRoom", (roomId) => {
        if (!roomId) {
          return socket.emit("error", { 
            message: "Room ID required", 
            code: "NO_ROOM_ID" 
          });
        }
        
        socket.join(roomId);
        console.log(`[ChatIA] ${userEmail} joined room: ${roomId}`);
        
        const history = getConversationHistory(roomId);
        
        socket.emit("roomJoined", { 
          roomId, 
          message: `Connected to room ${roomId}`,
          messageCount: history.length
        });
      });

      socket.on("leaveRoom", (roomId) => {
        if (!roomId) return;
        
        socket.leave(roomId);
        console.log(`[ChatIA] ${userEmail} left room: ${roomId}`);
      });

      socket.on("clearHistory", (roomId) => {
        if (!roomId) {
          return socket.emit("error", { 
            message: "Room ID required", 
            code: "NO_ROOM_ID" 
          });
        }
        
        clearHistory(roomId);
        socket.emit("historyCleared", { roomId });
        console.log(`[ChatIA] History cleared for ${roomId} by ${userEmail}`);
      });

      socket.on("sendChatMessage", async ({ roomId, replyId, message, file, userContext }) => {
        const timestamp = new Date().toISOString();
        
        console.log("\n" + "=".repeat(50));
        console.log(`[${timestamp}] NEW MESSAGE`);
        console.log("=".repeat(50));
        console.log(`Room: ${roomId}`);
        console.log(`User: ${userEmail} (${userId})`);
        console.log(`ReplyId: ${replyId}`);
        console.log(`Message: ${message?.substring(0, 100) || '(empty)'}${message?.length > 100 ? '...' : ''}`);
        console.log(`File: ${file ? 'Yes' : 'No'}`);
        console.log(`UserContext: ${userContext?.fullName || 'Not provided'}`);
        console.log("=".repeat(50) + "\n");

        if (!roomId || !replyId) {
          return socket.emit("error", { 
            message: "Room ID and Reply ID required", 
            code: "MISSING_PARAMS" 
          });
        }

        if (!message?.trim() && !file) {
          return socket.emit("error", { 
            message: "Empty message", 
            code: "EMPTY_MESSAGE" 
          });
        }

        try {
          let userMessage = message || "";

          // Audio transcription
          if (file) {
            console.log(`[ChatIA] Processing audio/image file`);
            
            try {
              const transcription = await transcribeAudio(file);
              
              if (transcription && typeof transcription === 'string') {
                userMessage = transcription;
                console.log(`[ChatIA] ✅ Transcription success: "${userMessage.substring(0, 100)}..."`);
              }
            } catch (audioErr) {
              console.error(`[ChatIA] ❌ Transcription error:`, audioErr.message);
              userMessage = message || "Audio transcription failed";
            }
          }

          if (!userMessage.trim()) {
            return socket.emit("error", { 
              message: "Could not process message", 
              code: "NO_CONTENT" 
            });
          }

          // Add to history
          addToHistory(roomId, "user", userMessage);

          // Build system prompt
          const systemPrompt = buildSystemPrompt(userContext);

          // Get conversation history
          const history = getConversationHistory(roomId);

          // ✅ Generate response with OPTIMIZED parameters
          console.log(`[ChatIA] 🤖 Calling AI Manager...`);

          const { stream, provider } = await aiManager.generateResponse(
            systemPrompt,
            history.slice(-10),
            { 
              stream: true,
              // ✅ PARAMÈTRES CRITIQUES pour réponses complètes
              max_tokens: 4000, // ✅ AUGMENTÉ: 4000 tokens (avant: 2000)
              temperature: 0.7,
              top_p: 0.95, // ✅ Favorise la diversité sans sacrifier la cohérence
              // ✅ Stop sequences pour éviter les coupures prématurées
              stop: null, // Pas de stop sequence personnalisée
            }
          );

          console.log(`[ChatIA] ✅ AI Provider: ${provider}`);

          // Stream response
          const fullResponse = await streamAIResponse(socket, roomId, replyId, provider, stream);

          // Add AI response to history
          addToHistory(roomId, "assistant", fullResponse);

          console.log(`[ChatIA] ✅ Response saved to history`);
          console.log(`[ChatIA] ✅ Total history: ${getConversationHistory(roomId).length} messages`);

        } catch (error) {
          console.error(`[ChatIA] ❌ CRITICAL ERROR`);
          console.error(`[ChatIA]    Room: ${roomId}`);
          console.error(`[ChatIA]    ReplyId: ${replyId}`);
          console.error(`[ChatIA]    Type: ${error.name}`);
          console.error(`[ChatIA]    Message: ${error.message}`);
          console.error(`[ChatIA]    Stack: ${error.stack}`);

          socket.emit("receiveGPTMessage", {
            replyId,
            role: "assistant",
            content: `❌ Erreur\n\nImpossible de générer une réponse.\n\n**Détails:** ${error.message || "Erreur inconnue"}\n\nVeuillez réessayer ou contacter l'administrateur si le problème persiste.`,
            typing: false,
          });
        }
      });

      socket.on("disconnect", (reason) => {
        console.log(`[ChatIA] 👋 Client disconnected: ${socket.id}`);
        console.log(`[ChatIA]    User: ${userEmail}`);
        console.log(`[ChatIA]    Reason: ${reason}`);
      });

      socket.on("getHistory", ({ roomId }) => {
        if (!roomId) {
          return socket.emit("error", { 
            message: "Room ID required", 
            code: "NO_ROOM_ID" 
          });
        }

        const history = getConversationHistory(roomId);
        socket.emit("historyLoaded", { 
          roomId, 
          history,
          messageCount: history.length 
        });
        
        console.log(`[ChatIA] History sent for ${roomId}: ${history.length} messages`);
      });

      socket.on("getAIStatus", () => {
        const status = aiManager.getStatus();
        socket.emit("aiStatus", { providers: status });
        console.log(`[ChatIA] AI status sent to ${userEmail}`);
      });
    });

    console.log("[ChatIA] ✅ /gpt namespace registered successfully");
  } catch (error) {
    console.error("[ChatIA] ❌ Error registering namespace:", error);
    throw error;
  }
}