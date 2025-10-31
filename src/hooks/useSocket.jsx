// frontend/hooks/useSocket.jsx - VERSION FINALE CORRIGÉE
import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;

/**
 * Hook personnalisé pour gérer les connexions Socket.IO
 * ✅ Gère l'authentification JWT
 * ✅ Reconnexion automatique intelligente
 * ✅ Prévient les connexions multiples
 * ✅ Support multi-namespace
 */
export function useSocket(namespace = "/") {
  const { getToken, user } = useAuth();
  
  // Refs
  const socketRef = useRef(null);
  const isInitializingRef = useRef(false);
  const reconnectCountRef = useRef(0);
  const hasCleanedUp = useRef(false);
  const currentNamespace = useRef(namespace);
  
  // States
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // ========================================
  // FONCTION DE NETTOYAGE
  // ========================================
  const cleanup = useCallback(() => {
    if (hasCleanedUp.current) return;
    
    console.log(`🧹 [Socket ${currentNamespace.current}] Nettoyage...`);
    hasCleanedUp.current = true;

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    isInitializingRef.current = false;
    reconnectCountRef.current = 0;
    setIsConnected(false);
    setError(null);
  }, []);

  // ========================================
  // INITIALISATION DU SOCKET
  // ========================================
  useEffect(() => {
    // Mise à jour du namespace courant
    currentNamespace.current = namespace;
    
    // Reset du flag de nettoyage
    hasCleanedUp.current = false;

    // ✅ Vérifications préliminaires
    if (!user) {
      console.warn(`⚠️ [Socket ${namespace}] Pas d'utilisateur, attente...`);
      return;
    }

    if (!namespace) {
      console.error(`❌ [Socket] Namespace manquant`);
      return;
    }

    // ✅ Éviter les initialisations multiples
    if (isInitializingRef.current) {
      console.log(`⏳ [Socket ${namespace}] Initialisation en cours, skip...`);
      return;
    }

    // ✅ Vérifier si déjà connecté au bon namespace
    if (
      socketRef.current?.connected &&
      socketRef.current?.nsp === namespace
    ) {
      console.log(`✅ [Socket ${namespace}] Déjà connecté`);
      setIsConnected(true);
      return;
    }

    // ========================================
    // FONCTION D'INITIALISATION
    // ========================================
    const initSocket = async () => {
      try {
        isInitializingRef.current = true;
        setError(null);

        // 1. Obtenir le token d'authentification
        const token = await getToken();
        if (!token) {
          console.warn(`⚠️ [Socket ${namespace}] Pas de token disponible`);
          setError("Authentication required");
          isInitializingRef.current = false;
          return;
        }

        console.log(`🔑 [Socket ${namespace}] Token obtenu: ${token.substring(0, 20)}...`);

        // 2. Nettoyer la connexion précédente si elle existe
        if (socketRef.current) {
          console.log(`🔄 [Socket ${namespace}] Nettoyage de la connexion précédente`);
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
          socketRef.current = null;
        }

        // 3. Construire l'URL du socket
        const socketUrl = `${SOCKET_URL}${namespace}`;
        console.log(`🔌 [Socket ${namespace}] Connexion à: ${socketUrl}`);

        // 4. Créer la connexion Socket.IO
        const socket = io(socketUrl, {
          auth: { token }, // ✅ CRITIQUE: Envoyer le token dans auth
          reconnection: false, // ✅ On gère manuellement la reconnexion
          timeout: 10000,
          transports: ["websocket", "polling"],
          autoConnect: true,
          forceNew: false, // ✅ Réutiliser la connexion si possible
        });

        // ========================================
        // EVENT: connect - Connexion réussie
        // ========================================
        socket.on("connect", () => {
          console.log(
            `✅ [Socket ${namespace}] Connecté (ID: ${socket.id})`
          );
          setIsConnected(true);
          setError(null);
          reconnectCountRef.current = 0;
          isInitializingRef.current = false;
        });

        // ========================================
        // EVENT: disconnect - Déconnexion
        // ========================================
        socket.on("disconnect", (reason) => {
          console.log(
            `🔴 [Socket ${namespace}] Déconnecté: ${reason}`
          );
          setIsConnected(false);

          // ✅ Déconnexion volontaire (pas de reconnexion)
          if (
            reason === "io client disconnect" ||
            reason === "io server disconnect"
          ) {
            console.log(`ℹ️ [Socket ${namespace}] Déconnexion volontaire`);
            isInitializingRef.current = false;
            return;
          }

          // ✅ Déconnexion involontaire (tentative de reconnexion)
          if (
            !hasCleanedUp.current &&
            reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS
          ) {
            reconnectCountRef.current++;
            console.log(
              `🔄 [Socket ${namespace}] Reconnexion ${reconnectCountRef.current}/${MAX_RECONNECT_ATTEMPTS} dans ${RECONNECT_DELAY}ms...`
            );

            setTimeout(() => {
              if (!hasCleanedUp.current && !socket.connected) {
                console.log(`🔄 [Socket ${namespace}] Tentative de reconnexion...`);
                socket.connect();
              }
            }, RECONNECT_DELAY);
          } else if (reconnectCountRef.current >= MAX_RECONNECT_ATTEMPTS) {
            console.error(
              `❌ [Socket ${namespace}] Nombre maximum de tentatives atteint`
            );
            setError("Connection lost. Please reload the page.");
            cleanup();
          }
        });

        // ========================================
        // EVENT: connect_error - Erreur de connexion
        // ========================================
        socket.on("connect_error", async (err) => {
          const errMsg = err.message || String(err);
          console.error(`❌ [Socket ${namespace}] Erreur: ${errMsg}`);
          setError(`Error: ${errMsg}`);

          // Cas 1: Token expiré - Tenter de rafraîchir
          if (
            errMsg.includes("TOKEN_EXPIRED") ||
            errMsg.includes("expired")
          ) {
            console.log(`🔄 [Socket ${namespace}] Token expiré, refresh...`);
            try {
              const newToken = await getToken();
              if (newToken && socket) {
                socket.auth.token = newToken;
                socket.connect();
                console.log(`✅ [Socket ${namespace}] Nouveau token appliqué`);
                return;
              }
            } catch (refreshErr) {
              console.error(
                `❌ [Socket ${namespace}] Impossible de rafraîchir le token:`,
                refreshErr
              );
            }
          }

          // Cas 2: Erreurs critiques d'authentification
          const criticalErrors = [
            "MISSING_TOKEN",
            "INVALID_TOKEN",
            "AUTH_ERROR",
            "USER_NOT_FOUND",
            "ACCOUNT_BANNED"
          ];

          if (criticalErrors.some(e => errMsg.includes(e))) {
            console.error(
              `🚫 [Socket ${namespace}] Erreur critique d'auth: ${errMsg}`
            );
            setError("Authentication error. Please re-login.");
            cleanup();
            return;
          }

          // Cas 3: Autres erreurs - Tenter reconnexion
          if (
            !hasCleanedUp.current &&
            reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS
          ) {
            reconnectCountRef.current++;
            console.log(
              `🔄 [Socket ${namespace}] Reconnexion ${reconnectCountRef.current}/${MAX_RECONNECT_ATTEMPTS}...`
            );

            setTimeout(() => {
              if (!hasCleanedUp.current && !socket.connected) {
                socket.connect();
              }
            }, RECONNECT_DELAY);
          }

          isInitializingRef.current = false;
        });

        // ========================================
        // EVENT: error - Erreur générale
        // ========================================
        socket.on("error", (err) => {
          console.error(`❌ [Socket ${namespace}] Erreur générale:`, err);
          setError(err.message || "Socket error");
        });

        // Stocker la référence du socket
        socketRef.current = socket;

      } catch (err) {
        console.error(`❌ [Socket ${namespace}] Erreur d'initialisation:`, err);
        setError(err.message);
        isInitializingRef.current = false;
        cleanup();
      }
    };

    // Lancer l'initialisation
    initSocket();

    // ========================================
    // CLEANUP au démontage du composant
    // ========================================
    return () => {
      cleanup();
    };
  }, [namespace, getToken, user, cleanup]);

  // ========================================
  // API PUBLIQUE
  // ========================================
  const emit = useCallback(
    (event, data) => {
      if (socketRef.current?.connected) {
        console.log(`📤 [Socket ${currentNamespace.current}] Emit: ${event}`);
        socketRef.current.emit(event, data);
        return true;
      } else {
        console.warn(
          `⚠️ [Socket ${currentNamespace.current}] Non connecté, emit("${event}") ignoré`
        );
        return false;
      }
    },
    []
  );

  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      console.log(`👂 [Socket ${currentNamespace.current}] Écoute: ${event}`);
      socketRef.current.on(event, callback);
    } else {
      console.warn(
        `⚠️ [Socket ${currentNamespace.current}] Socket non initialisé, on("${event}") ignoré`
      );
    }
  }, []);

  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      console.log(`🔇 [Socket ${currentNamespace.current}] Arrêt écoute: ${event}`);
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    error,
    emit,
    on,
    off,
  };
}

export default useSocket;