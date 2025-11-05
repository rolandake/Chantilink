// backend/sockets/index.js - VERSION CORRIGÉE
import { initVisionSocket } from "./visionSocket.js";
import { initializeSocket } from "./videosocket.js";
import { registerEngineeringSocket } from "./engineeringSocket.js";
import { registerStorySocket } from "./storySocket.js";
import { registerMessageSocket } from "./messageSocket.js";
import logger from "../config/moduleLogger.js";



export function handleSocketConnection(io) {
  // ✅ PAS DE MIDDLEWARE GLOBAL ICI
  // Chaque namespace gère sa propre authentification
  
  logger.info("🔌 Initialisation des modules Socket.IO...");
  
  // Initialisation des modules
  try { 
    initVisionSocket(io, logger); 
    logger.info("✅ VisionSocket initialisé");
  } catch (e) { 
    logger.error("❌ VisionSocket error:", e.message); 
  }
  
  try { 
    initializeSocket(io); 
    logger.info("✅ VideoSocket initialisé");
  } catch (e) { 
    logger.error("❌ VideoSocket error:", e.message); 
  }
  
  try { 
    registerEngineeringSocket(io); 
    logger.info("✅ EngineeringSocket initialisé");
  } catch (e) { 
    logger.error("❌ EngineeringSocket error:", e.message); 
  }
  
  try { 
    registerStorySocket(io); 
    logger.info("✅ StorySocket initialisé");
  } catch (e) { 
    logger.error("❌ StorySocket error:", e.message); 
  }
  
  try { 
    registerMessageSocket(io, logger); 
    logger.info("✅ MessageSocket initialisé");
  } catch (e) { 
    logger.error("❌ MessageSocket error:", e.message); 
  }

  logger.info("✅ Tous les modules Socket.IO sont initialisés");
}