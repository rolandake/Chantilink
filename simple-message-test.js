// ============================================
// TEST SIMPLIFIÉ - ENVOI DE MESSAGE
// ============================================

const io = require("socket.io-client");
const axios = require("axios");

const API_URL = "http://localhost:5000";
const SOCKET_URL = "http://localhost:5000/messages";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

console.log("\n" + "=".repeat(60));
console.log("📨 TEST SIMPLIFIÉ - ENVOI DE MESSAGE");
console.log("=".repeat(60) + "\n");

async function simpleTest() {
  try {
    // 1. Créer 2 utilisateurs
    console.log("1️⃣  Création des utilisateurs...");
    const timestamp = Date.now();
    const email1 = `user1_${timestamp}@test.com`;
    const email2 = `user2_${timestamp}@test.com`;

    const user1Response = await axios.post(`${API_URL}/api/auth/register`, {
      fullName: "User One",
      email: email1,
      confirmEmail: email1,
      password: "Test1234!",
    });

    const user2Response = await axios.post(`${API_URL}/api/auth/register`, {
      fullName: "User Two",
      email: email2,
      confirmEmail: email2,
      password: "Test1234!",
    });

    const user1 = user2Response.data.user;
    const user2 = user2Response.data.user;
    const token1 = user1Response.data.token;
    const token2 = user2Response.data.token;
    const userId1 = user1Response.data.user.id || user1Response.data.user._id;
    const userId2 = user2Response.data.user.id || user2Response.data.user._id;

    console.log(`${colors.green}✅ User1 créé: ${userId1}${colors.reset}`);
    console.log(`${colors.green}✅ User2 créé: ${userId2}${colors.reset}`);

    // 2. Connecter User1
    console.log("\n2️⃣  Connexion Socket User1...");
    const socket1 = io(SOCKET_URL, {
      auth: { token: token1 },
      transports: ["websocket", "polling"],
    });

    await new Promise((resolve, reject) => {
      socket1.on("connect", () => {
        console.log(`${colors.green}✅ User1 connecté: ${socket1.id}${colors.reset}`);
        resolve();
      });
      socket1.on("connect_error", (err) => {
        console.log(`${colors.red}❌ Erreur User1: ${err.message}${colors.reset}`);
        reject(err);
      });
      setTimeout(() => reject(new Error("Timeout User1")), 5000);
    });

    // 3. Connecter User2
    console.log("\n3️⃣  Connexion Socket User2...");
    const socket2 = io(SOCKET_URL, {
      auth: { token: token2 },
      transports: ["websocket", "polling"],
    });

    await new Promise((resolve, reject) => {
      socket2.on("connect", () => {
        console.log(`${colors.green}✅ User2 connecté: ${socket2.id}${colors.reset}`);
        resolve();
      });
      socket2.on("connect_error", (err) => {
        console.log(`${colors.red}❌ Erreur User2: ${err.message}${colors.reset}`);
        reject(err);
      });
      setTimeout(() => reject(new Error("Timeout User2")), 5000);
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 4. Écouter les événements
    console.log("\n4️⃣  Configuration des listeners...");

    socket1.onAny((eventName, ...args) => {
      console.log(`${colors.cyan}[Socket1 📨] Événement reçu: ${eventName}${colors.reset}`);
      console.log("   Data:", JSON.stringify(args, null, 2));
    });

    socket2.onAny((eventName, ...args) => {
      console.log(`${colors.cyan}[Socket2 📨] Événement reçu: ${eventName}${colors.reset}`);
      console.log("   Data:", JSON.stringify(args, null, 2));
    });

    // 5. Envoyer un message de User1 à User2
    console.log("\n5️⃣  Envoi de message User1 → User2...");
    console.log(`   Sender ID: ${userId1}`);
    console.log(`   Recipient ID: ${userId2}`);
    console.log(`   Content: "Hello from User1!"`);

    const messagePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log(`${colors.red}❌ Timeout: Aucune confirmation reçue en 10s${colors.reset}`);
        reject(new Error("Timeout"));
      }, 10000);

      socket1.once("messageSent", (data) => {
        clearTimeout(timeout);
        console.log(`${colors.green}✅ Message confirmé par le serveur!${colors.reset}`);
        resolve(data);
      });

      socket1.once("messageError", (error) => {
        clearTimeout(timeout);
        console.log(`${colors.red}❌ Erreur serveur: ${error.error}${colors.reset}`);
        reject(error);
      });
    });

    socket1.emit("sendMessage", {
      recipientId: userId2,
      content: "Hello from User1!",
    });

    const result = await messagePromise;

    console.log("\n" + "=".repeat(60));
    console.log(`${colors.green}✅ TEST RÉUSSI!${colors.reset}`);
    console.log("=".repeat(60));
    console.log("Message envoyé:", JSON.stringify(result, null, 2));

    // Attendre un peu pour voir si User2 reçoit le message
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Cleanup
    socket1.disconnect();
    socket2.disconnect();
    process.exit(0);
  } catch (error) {
    console.log("\n" + "=".repeat(60));
    console.log(`${colors.red}❌ TEST ÉCHOUÉ${colors.reset}`);
    console.log("=".repeat(60));
    console.error("Erreur:", error.message);
    if (error.stack) {
      console.error("\nStack:", error.stack);
    }
    process.exit(1);
  }
}

simpleTest();