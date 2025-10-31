// ============================================
// useVisionIA.js - HOOK AVEC GESTION PROPRE DES SOCKETS
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

export function useVisionIA(userId, projectType, engineerMode) {
  const { socket: visionSocket } = useSocket('/vision');
  
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [currentProvider, setCurrentProvider] = useState(null);
  const [messages, setMessages] = useState([]);
  const [roomId, setRoomId] = useState(null);

  // 🔥 Refs pour éviter les problèmes de cleanup
  const isMountedRef = useRef(true);
  const currentRoomRef = useRef(null);

  // ========================================
  // 🔥 NETTOYAGE GLOBAL DU HOOK
  // ========================================
  useEffect(() => {
    console.log('[VisionIA] 🚀 Hook monté');
    isMountedRef.current = true;

    return () => {
      console.log('[VisionIA] 🧹 Hook démonté');
      isMountedRef.current = false;
      
      // 🔥 Quitter la room si connecté
      if (currentRoomRef.current && visionSocket?.connected) {
        console.log('[VisionIA] 👋 Quitter room:', currentRoomRef.current);
        try {
          visionSocket.emit('leaveVisionRoom', { roomId: currentRoomRef.current });
        } catch (error) {
          console.error('[VisionIA] Erreur leaveRoom:', error);
        }
      }
    };
  }, []); // Seulement au mount/unmount

  // ========================================
  // 🔥 GESTION DE LA CONNEXION SOCKET
  // ========================================
  useEffect(() => {
    if (!visionSocket || !userId) {
      console.log('[VisionIA] ⏳ En attente de userId...');
      setConnected(false);
      return;
    }

    // Vérifier si déjà connecté
    if (visionSocket.connected) {
      console.log('[VisionIA] ✅ Socket déjà connecté');
      setConnected(true);
    }

    // Listeners de connexion
    const handleConnect = () => {
      if (!isMountedRef.current) return;
      console.log('[VisionIA] ✅ Socket connecté');
      setConnected(true);
    };

    const handleDisconnect = (reason) => {
      if (!isMountedRef.current) return;
      console.log('[VisionIA] ❌ Socket déconnecté:', reason);
      setConnected(false);
      setCurrentProvider(null);
    };

    visionSocket.on('connect', handleConnect);
    visionSocket.on('disconnect', handleDisconnect);

    return () => {
      console.log('[VisionIA] 🧹 Nettoyage listeners connexion');
      visionSocket.off('connect', handleConnect);
      visionSocket.off('disconnect', handleDisconnect);
    };
  }, [visionSocket, userId]);

  // ========================================
  // 🔥 REJOINDRE LA ROOM VISION
  // ========================================
  useEffect(() => {
    if (!visionSocket?.connected || !userId) {
      return;
    }

    const newRoomId = `vision-${userId}-${projectType}-${engineerMode}`;
    
    // Éviter de rejoindre la même room
    if (currentRoomRef.current === newRoomId) {
      console.log('[VisionIA] 🔄 Déjà dans la room:', newRoomId);
      return;
    }

    // Quitter l'ancienne room si nécessaire
    if (currentRoomRef.current && visionSocket.connected) {
      console.log('[VisionIA] 👋 Quitter ancienne room:', currentRoomRef.current);
      visionSocket.emit('leaveVisionRoom', { roomId: currentRoomRef.current });
    }

    // Rejoindre la nouvelle room
    console.log('[VisionIA] 🎯 Rejoindre room:', newRoomId);
    visionSocket.emit('joinVisionRoom', { 
      roomId: newRoomId,
      userId,
      projectType,
      engineerMode 
    });

    // Mettre à jour les refs
    currentRoomRef.current = newRoomId;
    setRoomId(newRoomId);

    // Cleanup: quitter la room au changement
    return () => {
      if (currentRoomRef.current && visionSocket?.connected) {
        console.log('[VisionIA] 👋 Quitter room (changement):', currentRoomRef.current);
        try {
          visionSocket.emit('leaveVisionRoom', { roomId: currentRoomRef.current });
        } catch (error) {
          console.error('[VisionIA] Erreur leaveRoom:', error);
        }
      }
      currentRoomRef.current = null;
    };
  }, [visionSocket, userId, projectType, engineerMode]);

  // ========================================
  // 🔥 LISTENERS DE MESSAGES
  // ========================================
  useEffect(() => {
    if (!visionSocket?.connected || !roomId) {
      return;
    }

    console.log('[VisionIA] 👂 Configuration des listeners pour:', roomId);

    // Room rejoint avec succès
    const handleRoomJoined = (data) => {
      if (!isMountedRef.current) return;
      console.log('[VisionIA] ✅ Room rejointe:', data);
      
      if (data.history && Array.isArray(data.history)) {
        setMessages(data.history);
      }
    };

    // Message IA reçu
    const handleVisionMessage = (data) => {
      if (!isMountedRef.current) return;
      console.log('[VisionIA] 📨 Message reçu:', data);
      
      setTyping(false);
      
      if (data.message) {
        const newMessage = {
          id: data.id || Date.now(),
          role: 'ai',
          content: data.message,
          provider: data.provider,
          timestamp: data.timestamp || new Date(),
          ...data
        };
        
        setMessages(prev => [...prev, newMessage]);
      }
    };

    // Status IA (typing, provider change, etc.)
    const handleVisionStatus = (data) => {
      if (!isMountedRef.current) return;
      console.log('[VisionIA] 📊 Status:', data);
      
      if (data.typing !== undefined) {
        setTyping(data.typing);
      }
      
      if (data.provider) {
        setCurrentProvider(data.provider);
      }
    };

    // Historique effacé
    const handleHistoryCleared = () => {
      if (!isMountedRef.current) return;
      console.log('[VisionIA] 🗑️ Historique effacé');
      setMessages([]);
    };

    // Erreur
    const handleError = (error) => {
      if (!isMountedRef.current) return;
      console.error('[VisionIA] ❌ Erreur:', error);
      setTyping(false);
      
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'system',
        content: `❌ Erreur: ${error.message || 'Une erreur est survenue'}`,
        type: 'error',
        timestamp: new Date()
      }]);
    };

    // Attacher les listeners
    visionSocket.on('visionRoomJoined', handleRoomJoined);
    visionSocket.on('receiveVisionMessage', handleVisionMessage);
    visionSocket.on('visionStatus', handleVisionStatus);
    visionSocket.on('visionHistoryCleared', handleHistoryCleared);
    visionSocket.on('error', handleError);

    // Cleanup des listeners
    return () => {
      console.log('[VisionIA] 🧹 Nettoyage listeners messages');
      visionSocket.off('visionRoomJoined', handleRoomJoined);
      visionSocket.off('receiveVisionMessage', handleVisionMessage);
      visionSocket.off('visionStatus', handleVisionStatus);
      visionSocket.off('visionHistoryCleared', handleHistoryCleared);
      visionSocket.off('error', handleError);
    };
  }, [visionSocket, roomId]);

  // ========================================
  // 🔥 FONCTION D'ENVOI DE MESSAGE
  // ========================================
  const sendMessage = useCallback((text, context = {}) => {
    if (!visionSocket?.connected) {
      console.warn('[VisionIA] ⚠️ Socket non connecté');
      return false;
    }

    if (!roomId) {
      console.warn('[VisionIA] ⚠️ Room non définie');
      return false;
    }

    if (!text?.trim()) {
      console.warn('[VisionIA] ⚠️ Message vide');
      return false;
    }

    console.log('[VisionIA] 📤 Envoi message:', text.substring(0, 50));
    
    setTyping(true);
    
    try {
      visionSocket.emit('sendVisionMessage', {
        roomId,
        message: text,
        projectType,
        engineerMode,
        ...context
      });
      
      return true;
    } catch (error) {
      console.error('[VisionIA] ❌ Erreur envoi:', error);
      setTyping(false);
      return false;
    }
  }, [visionSocket, roomId, projectType, engineerMode]);

  // ========================================
  // 🔥 FONCTION D'EFFACEMENT D'HISTORIQUE
  // ========================================
  const clearHistory = useCallback(() => {
    if (!visionSocket?.connected || !roomId) {
      console.warn('[VisionIA] ⚠️ Impossible d\'effacer l\'historique');
      return false;
    }

    console.log('[VisionIA] 🗑️ Effacement historique');
    
    try {
      visionSocket.emit('clearVisionHistory', { roomId });
      setMessages([]);
      return true;
    } catch (error) {
      console.error('[VisionIA] ❌ Erreur effacement:', error);
      return false;
    }
  }, [visionSocket, roomId]);

  // ========================================
  // 🔥 RETOUR DU HOOK
  // ========================================
  return {
    connected,
    typing,
    currentProvider,
    messages,
    roomId,
    sendMessage,
    clearHistory
  };
}