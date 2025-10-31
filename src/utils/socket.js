import { io as socketIOClient } from "socket.io-client";

let socket;

export function initSocket(token) {
  if (!socket) {
    socket = socketIOClient(process.env.REACT_APP_API_URL || "http://localhost:5000", {
      auth: { token },
      transports: ["websocket"],
    });
  }
  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket non initialisé. Appelle initSocket() d'abord.");
  return socket;
}
