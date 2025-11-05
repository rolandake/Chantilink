// backend/sockets/visionSocket.js - NAMESPACE /vision POUR BUREAU D'ÉTUDE
import { aiManager } from "../utils/aiProviderManager.js";
import logger from "../config/moduleLogger.js";


// Historiques de conversation par room
const projectHistories = new Map();

function getProjectHistory(roomId) {
  if (!projectHistories.has(roomId)) {
    projectHistories.set(roomId, []);
  }
  return projectHistories.get(roomId);
}

function addToProjectHistory(roomId, role, content) {
  const history = getProjectHistory(roomId);
  history.push({ role, content });
  
  if (history.length > 30) {
    projectHistories.set(roomId, history.slice(-30));
  }
}

function clearProjectHistory(roomId) {
  projectHistories.delete(roomId);
  logger.info(`[Vision] History cleared for room: ${roomId}`);
}

// ========================================
// STREAMING PROGRESSIF
// ========================================
async function streamVisionResponse(socket, roomId, replyId, provider, responseStream) {
  let fullResponse = "";
  let chunkCount = 0;
  let tokenBuffer = "";
  
  const EMIT_INTERVAL = 30;
  const CHARS_PER_EMIT = 3;
  const FLUSH_TIMEOUT = 5000;

  let lastTokenTime = Date.now();
  let streamComplete = false;

  const flushBuffer = () => {
    if (tokenBuffer.length > 0) {
      const toSend = tokenBuffer.slice(0, CHARS_PER_EMIT);
      tokenBuffer = tokenBuffer.slice(CHARS_PER_EMIT);
      
      socket.emit("visionResponse", {
        replyId,
        role: "assistant",
        content: toSend,
        typing: true,
        provider,
      });
    }
  };

  const flushInterval = setInterval(() => {
    const timeSinceLastToken = Date.now() - lastTokenTime;

    if (tokenBuffer.length > 0) {
      flushBuffer();
    }

    if (timeSinceLastToken > FLUSH_TIMEOUT && !streamComplete && fullResponse.length > 0) {
      logger.warn(`[Vision] Stream timeout detected`);
      streamComplete = true;
      clearInterval(flushInterval);
      
      while (tokenBuffer.length > 0) {
        flushBuffer();
      }
      
      socket.emit("visionResponse", {
        replyId,
        content: "",
        typing: false,
        complete: true,
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
          streamComplete = true;
        }
      }
    }

    streamComplete = true;
    
    while (tokenBuffer.length > 0) {
      flushBuffer();
      await new Promise(resolve => setTimeout(resolve, EMIT_INTERVAL));
    }
    
    clearInterval(flushInterval);
    await new Promise(resolve => setTimeout(resolve, 100));

    socket.emit("visionResponse", {
      replyId,
      content: "",
      typing: false,
      complete: true,
      provider,
    });

    logger.info(`[Vision] Stream COMPLETE - Provider: ${provider}, Chunks: ${chunkCount}, Length: ${fullResponse.length}`);

    return fullResponse;

  } catch (streamErr) {
    logger.error(`[Vision] Stream error:`, streamErr.message);
    
    streamComplete = true;
    clearInterval(flushInterval);
    
    while (tokenBuffer.length > 0) {
      flushBuffer();
    }
    
    socket.emit("visionResponse", {
      replyId,
      content: "",
      typing: false,
      complete: true,
    });

    throw streamErr;
  }
}

// ========================================
// SYSTEM PROMPT POUR BUREAU D'ÉTUDE
// ========================================
function buildVisionSystemPrompt(projectType, engineerMode, userContext) {
  let systemPrompt = `You are an expert civil engineering AI assistant specializing in construction project analysis and design.

CRITICAL INSTRUCTION - Complete responses:
- ALWAYS finish your sentences completely
- NEVER stop mid-sentence or mid-calculation
- Always conclude with proper punctuation
- Complete all lists and enumerations

MULTILINGUAL SUPPORT:
- Automatically detect the user's language
- ALWAYS respond in the SAME language as the question
- Adapt technical terminology to the language

PROJECT CONTEXT:
- Project Type: ${projectType}
- Engineer Mode: ${engineerMode}

EXPERTISE AREAS:
- Structural analysis and design
- Blueprint and plan interpretation
- Material quantity estimation
- Cost calculations
- Regulatory compliance (DTU, Eurocodes, BAEL)
- Construction methodology
- Site planning and management

RESPONSE FORMAT:
- Use markdown for clarity
- Bold (**text**) for important points
- Bullet lists with - for items
- Always provide complete calculations with units
- Include safety factors and regulations
- Provide cost estimates when relevant

TECHNICAL GUIDELINES:
- Always verify calculations against standards
- Provide alternative solutions when applicable
- Flag potential safety issues
- Consider sustainability and efficiency
- Adapt technical level to user's expertise`;

  if (userContext?.fullName) {
    systemPrompt += `\n\nUSER CONTEXT:\n`;
    systemPrompt += `- Name: ${userContext.fullName}\n`;
    if (userContext.role) systemPrompt += `- Role: ${userContext.role}\n`;
    if (userContext.isPremium) systemPrompt += `- Status: Premium Member (provide in-depth analysis)\n`;
    if (userContext.location) systemPrompt += `- Location: ${userContext.location}\n`;
  }

  return systemPrompt;
}

// ========================================
// EXPORT FONCTION D'ENREGISTREMENT
// ========================================
export function registerVisionSocket(io) {
  logger.info("[Vision] ========================================");
  logger.info("[Vision] DÉBUT ENREGISTREMENT NAMESPACE /vision");
  logger.info("[Vision] ========================================");
  
  try {
    const visionNamespace = io.of("/vision");
    logger.info("[Vision] ✅ Namespace créé:", visionNamespace.name);
    
    visionNamespace.on("connection", (socket) => {
      const userEmail = socket.data?.user?.email || "anonymous";
      const userId = socket.data?.user?.id || "unknown";
      
      logger.info(`[Vision] ✅ Client connected: ${socket.id}`);
      logger.info(`[Vision]    User: ${userEmail} (ID: ${userId})`);

      // ========================================
      // ÉVÉNEMENT: JOIN PROJECT
      // ========================================
      socket.on("joinProject", ({ roomId, projectType, engineerMode }) => {
        if (!roomId) {
          return socket.emit("error", { 
            message: "Room ID required", 
            code: "NO_ROOM_ID" 
          });
        }
        
        socket.join(roomId);
        logger.info(`[Vision] ${userEmail} joined project: ${roomId}`);
        logger.info(`[Vision]    Type: ${projectType}, Mode: ${engineerMode}`);
        
        const history = getProjectHistory(roomId);
        
        // Obtenir les providers disponibles
        const aiStatus = aiManager.getStatus();
        const availableProviders = aiStatus
          .filter(p => p.isActive)
          .map(p => p.name);
        
        socket.emit("projectJoined", { 
          roomId,
          projectType,
          engineerMode,
          messageCount: history.length,
          availableProviders
        });
      });

      // ========================================
      // ÉVÉNEMENT: LEAVE PROJECT
      // ========================================
      socket.on("leaveProject", (roomId) => {
        if (!roomId) return;
        
        socket.leave(roomId);
        logger.info(`[Vision] ${userEmail} left project: ${roomId}`);
      });

      // ========================================
      // ÉVÉNEMENT: CLEAR HISTORY
      // ========================================
      socket.on("clearHistory", ({ roomId }) => {
        if (!roomId) {
          return socket.emit("error", { 
            message: "Room ID required", 
            code: "NO_ROOM_ID" 
          });
        }
        
        clearProjectHistory(roomId);
        socket.emit("historyCleared", { roomId });
        logger.info(`[Vision] History cleared for ${roomId} by ${userEmail}`);
      });

      // ========================================
      // ÉVÉNEMENT: SEND VISION MESSAGE
      // ========================================
      socket.on("sendVisionMessage", async (data) => {
        const { 
          roomId, 
          replyId, 
          message, 
          projectType, 
          engineerMode,
          planData,
          calculations,
          phase,
          context 
        } = data;

        const timestamp = new Date().toISOString();
        
        logger.info("\n" + "=".repeat(50));
        logger.info(`[${timestamp}] NEW VISION MESSAGE`);
        logger.info("=".repeat(50));
        logger.info(`Room: ${roomId}`);
        logger.info(`User: ${userEmail} (${userId})`);
        logger.info(`ReplyId: ${replyId}`);
        logger.info(`Message: ${message?.substring(0, 100) || '(empty)'}${message?.length > 100 ? '...' : ''}`);
        logger.info(`Project: ${projectType} | Mode: ${engineerMode} | Phase: ${phase || 'N/A'}`);
        logger.info(`Has Plan: ${!!planData} | Has Calculations: ${!!calculations}`);
        logger.info("=".repeat(50) + "\n");

        if (!roomId || !replyId) {
          return socket.emit("error", { 
            message: "Room ID and Reply ID required", 
            code: "MISSING_PARAMS" 
          });
        }

        if (!message?.trim()) {
          return socket.emit("error", { 
            message: "Empty message", 
            code: "EMPTY_MESSAGE" 
          });
        }

        try {
          // Construire le contexte enrichi
          let enrichedMessage = message;
          
          if (planData) {
            enrichedMessage += `\n\n**PLAN DATA:**\n${JSON.stringify(planData, null, 2)}`;
          }
          
          if (calculations && Object.keys(calculations).length > 0) {
            enrichedMessage += `\n\n**CALCULATIONS:**\n${JSON.stringify(calculations, null, 2)}`;
          }
          
          if (phase) {
            enrichedMessage += `\n\n**PROJECT PHASE:** ${phase}`;
          }

          // Ajouter à l'historique
          addToProjectHistory(roomId, "user", enrichedMessage);

          // Construire le system prompt
          const userContext = {
            fullName: socket.data.user.fullName,
            role: socket.data.user.role,
            isPremium: socket.data.user.isPremium,
          };
          
          const systemPrompt = buildVisionSystemPrompt(projectType, engineerMode, userContext);

          // Récupérer l'historique
          const history = getProjectHistory(roomId);

          // Générer la réponse
          logger.info(`[Vision] 🤖 Calling AI Manager...`);

          // Envoyer info du provider avant le streaming
          const aiStatus = aiManager.getStatus();
          const activeProvider = aiStatus.find(p => p.isActive);
          
          if (activeProvider) {
            socket.emit("providerInfo", { provider: activeProvider.name });
          }

          const { stream, provider } = await aiManager.generateResponse(
            systemPrompt,
            history.slice(-15), // Plus de contexte pour projets complexes
            { 
              stream: true,
              max_tokens: 4000,
              temperature: 0.7,
              top_p: 0.95,
              stop: null,
            }
          );

          logger.info(`[Vision] ✅ AI Provider: ${provider}`);

          // Stream response
          const fullResponse = await streamVisionResponse(
            socket, 
            roomId, 
            replyId, 
            provider, 
            stream
          );

          // Ajouter la réponse à l'historique
          addToProjectHistory(roomId, "assistant", fullResponse);

          logger.info(`[Vision] ✅ Response saved to history`);
          logger.info(`[Vision] ✅ Total history: ${getProjectHistory(roomId).length} messages`);

        } catch (error) {
          logger.error(`[Vision] ❌ CRITICAL ERROR`);
          logger.error(`[Vision]    Room: ${roomId}`);
          logger.error(`[Vision]    ReplyId: ${replyId}`);
          logger.error(`[Vision]    Type: ${error.name}`);
          logger.error(`[Vision]    Message: ${error.message}`);
          logger.error(`[Vision]    Stack: ${error.stack}`);

          socket.emit("visionResponse", {
            replyId,
            role: "assistant",
            content: `❌ Erreur\n\nImpossible de générer une réponse.\n\n**Détails:** ${error.message || "Erreur inconnue"}\n\nVeuillez réessayer.`,
            typing: false,
            complete: true,
          });
        }
      });

      // ========================================
      // ÉVÉNEMENT: GET HISTORY
      // ========================================
      socket.on("getHistory", ({ roomId }) => {
        if (!roomId) {
          return socket.emit("error", { 
            message: "Room ID required", 
            code: "NO_ROOM_ID" 
          });
        }

        const history = getProjectHistory(roomId);
        socket.emit("historyLoaded", { 
          roomId, 
          history,
          messageCount: history.length 
        });
        
        logger.info(`[Vision] History sent for ${roomId}: ${history.length} messages`);
      });

      // ========================================
      // ÉVÉNEMENT: GET AI STATUS
      // ========================================
      socket.on("getAIStatus", () => {
        const status = aiManager.getStatus();
        socket.emit("aiStatus", { providers: status });
        logger.info(`[Vision] AI status sent to ${userEmail}`);
      });

      // ========================================
      // ÉVÉNEMENT: DISCONNECT
      // ========================================
      socket.on("disconnect", (reason) => {
        logger.info(`[Vision] 👋 Client disconnected: ${socket.id}`);
        logger.info(`[Vision]    User: ${userEmail}`);
        logger.info(`[Vision]    Reason: ${reason}`);
      });
    });

    logger.info("[Vision] ✅ /vision namespace registered successfully");
    return visionNamespace;
  } catch (error) {
    logger.error("[Vision] ❌ Error registering namespace:", error);
    throw error;
  }
}