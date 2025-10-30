// backend/sockets/engineeringSocket.js
import { Server } from "socket.io";

/**
 * Gère les connexions du namespace d'ingénierie (calculs, IA locale, etc.)
 * @param {Server} io - Instance principale de Socket.IO
 */
export function registerEngineeringSocket(io) {
  const namespace = io.of("/engineering");

  namespace.on("connection", (socket) => {
    console.log(`🧮 [EngineeringSocket] Client connecté: ${socket.id}`);

    // Exemple d'événement : réception de calcul
    socket.on("calculate", (data) => {
      console.log("⚙️ Données reçues pour calcul:", data);

      // Exemple de simulation de calcul
      const result = (data?.a || 0) + (data?.b || 0);

      // Renvoie le résultat au client
      socket.emit("calculationResult", { result });
    });

    socket.on("disconnect", (reason) => {
      console.log(`❌ [EngineeringSocket] Déconnexion: ${socket.id} (${reason})`);
    });
  });

  console.log("✅ [EngineeringSocket] Namespace '/engineering' initialisé");
}
