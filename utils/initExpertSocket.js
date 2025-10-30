// backend/utils/initExpertSocket.js
import { handleExpertProject } from './localAIExpert.js';

/**
 * Initialise le WebSocket pour l'IA experte locale
 * @param {import("socket.io").Server} io
 */
export function initExpertSocket(io) {
  io.on("connection", (socket) => {
    console.log("🟢 Client connecté Local Expert:", socket.id);

    // Écoute des sessions expertes
    socket.on("startExpertSession", async ({ userId, projectType, initialMessage, planFile }) => {
      try {
        // Ici on peut ajouter le résumé du plan, etc.
        const result = await handleExpertProject({
          history: [{ role: "user", content: initialMessage }],
          projectType,
          planSummary: planFile?.path || "",
        });

        // Envoi de la réponse à l'utilisateur
        io.to(socket.id).emit("expertResponse", result);
      } catch (err) {
        console.error("Erreur Local Expert:", err);
        io.to(socket.id).emit("expertResponse", {
          response: "❌ Une erreur est survenue lors du traitement du projet",
          questions: [],
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("🔴 Client déconnecté Local Expert:", socket.id);
    });
  });
}
