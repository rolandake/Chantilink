// frontend/hooks/useChatSocket.js
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { playSendSound, playReceiveSound } from "../utils/sounds";

export function useChatSocket(token, userId) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef({});

  useEffect(() => {
    if (!token || !userId) return;

    // Créer la connexion Socket.IO avec authentification
    const newSocket = io(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/messages`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;

    // ========================================
    // ÉVÉNEMENTS DE CONNEXION
    // ========================================
    newSocket.on("connect", () => {
      console.log("✅ Socket connecté:", newSocket.id);
      setConnected(true);
      setSocket(newSocket);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("🔌 Socket déconnecté:", reason);
      setConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Erreur de connexion Socket:", error.message);
      setConnected(false);
    });

    // ========================================
    // UTILISATEURS EN LIGNE
    // ========================================
    newSocket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    newSocket.on("userOnline", ({ userId: onlineUserId }) => {
      setOnlineUsers((prev) => {
        if (!prev.includes(onlineUserId)) {
          return [...prev, onlineUserId];
        }
        return prev;
      });
    });

    newSocket.on("userOffline", ({ userId: offlineUserId }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== offlineUserId));
    });

    // ========================================
    // INDICATEURS DE FRAPPE
    // ========================================
    newSocket.on("userTyping", ({ userId: typingUserId, username }) => {
      setTypingUsers((prev) => ({ ...prev, [typingUserId]: username }));

      // Auto-clear après 3 secondes
      if (typingTimeoutRef.current[typingUserId]) {
        clearTimeout(typingTimeoutRef.current[typingUserId]);
      }
      typingTimeoutRef.current[typingUserId] = setTimeout(() => {
        setTypingUsers((prev) => {
          const newState = { ...prev };
          delete newState[typingUserId];
          return newState;
        });
      }, 3000);
    });

    newSocket.on("userStoppedTyping", ({ userId: typingUserId }) => {
      setTypingUsers((prev) => {
        const newState = { ...prev };
        delete newState[typingUserId];
        return newState;
      });
      if (typingTimeoutRef.current[typingUserId]) {
        clearTimeout(typingTimeoutRef.current[typingUserId]);
      }
    });

    // Cleanup
    return () => {
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
      newSocket.disconnect();
    };
  }, [token, userId]);

  // ========================================
  // MÉTHODES UTILITAIRES
  // ========================================
  const sendMessage = (data) => {
    if (!socketRef.current || !connected) {
      console.error("❌ Socket non connecté");
      return;
    }
    socketRef.current.emit("sendMessage", data);
    playSendSound();
  };

  const markAsRead = (senderId) => {
    if (!socketRef.current || !connected) return;
    socketRef.current.emit("markAsRead", { senderId });
  };

  const loadConversation = (otherUserId, page = 1, limit = 50) => {
    if (!socketRef.current || !connected) return;
    socketRef.current.emit("loadConversation", { userId: otherUserId, page, limit });
  };

  const deleteMessage = (messageId, forEveryone = false) => {
    if (!socketRef.current || !connected) return;
    socketRef.current.emit("deleteMessage", { messageId, forEveryone });
  };

  const forwardMessage = (messageId, recipientIds) => {
    if (!socketRef.current || !connected) return;
    socketRef.current.emit("forwardMessage", { messageId, recipientIds });
  };

  const startTyping = (recipientId) => {
    if (!socketRef.current || !connected) return;
    socketRef.current.emit("typing", { recipientId });
  };

  const stopTyping = (recipientId) => {
    if (!socketRef.current || !connected) return;
    socketRef.current.emit("stopTyping", { recipientId });
  };

  const getUnreadCounts = () => {
    if (!socketRef.current || !connected) return;
    socketRef.current.emit("getUnreadCounts");
  };

  // Écouter un événement personnalisé
  const on = (eventName, callback) => {
    if (!socketRef.current) return;
    socketRef.current.on(eventName, callback);
    return () => socketRef.current.off(eventName, callback);
  };

  // Arrêter d'écouter un événement
  const off = (eventName, callback) => {
    if (!socketRef.current) return;
    socketRef.current.off(eventName, callback);
  };

  return {
    socket: socketRef.current,
    connected,
    onlineUsers,
    typingUsers,
    sendMessage,
    markAsRead,
    loadConversation,
    deleteMessage,
    forwardMessage,
    startTyping,
    stopTyping,
    getUnreadCounts,
    on,
    off,
  };
}