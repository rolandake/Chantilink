// src/Home/ModernChatApp.jsx - VERSION OPTIMISÉE COMPLÈTE
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Paperclip, Forward, Trash2, Video, Phone, X, AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useChatSocket } from "../../hooks/useChatSocket";
import { playSendSound, playReceiveSound } from "../../utils/sounds";
import axios from "axios";
import ContactsSync from "../../components/ContactsSync";
import Toast from "../../components/Toast";
import CallManager from "../../components/CallManager";
import CallUI from "../../components/CallUI";
import PhoneModal from "../../components/PhoneModal";

// ========================================
// CONFIGURATION AMÉLIORÉE
// ========================================
const CONFIG = {
  MAX_MESSAGE_LENGTH: 5000,
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  TYPING_TIMEOUT: 1000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  SCROLL_BEHAVIOR: 'smooth',
  SUPPORTED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'],
  API_TIMEOUT: 30000,
  RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 5,
};

const MESSAGES = {
  errors: {
    loadConnections: 'Erreur lors du chargement des connexions',
    loadStats: 'Erreur lors du chargement des statistiques',
    sendMessage: 'Erreur lors de l\'envoi du message',
    uploadFile: 'Erreur lors de l\'envoi du fichier',
    fileTooBig: `Fichier trop volumineux (max ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`,
    unsupportedFileType: 'Type de fichier non supporté',
    messageToLong: `Message trop long (max ${CONFIG.MAX_MESSAGE_LENGTH} caractères)`,
    noConnection: 'Pas de connexion internet',
    sessionExpired: 'Session expirée. Veuillez vous reconnecter.',
    apiError: 'Erreur serveur. Réessayez plus tard.',
    networkError: 'Erreur réseau. Vérifiez votre connexion.',
  },
  success: {
    messageSent: 'Message envoyé',
    messageDeleted: 'Message supprimé',
    messageDeletedForAll: 'Message supprimé pour tous',
    fileUploaded: 'Fichier envoyé',
    messageForwarded: 'Message transféré',
    contactsSynced: 'Contacts synchronisés',
    phoneAdded: '✅ Numéro enregistré avec succès !',
    reconnected: '✅ Reconnecté au serveur',
  },
  info: {
    uploading: 'Envoi en cours...',
    loading: 'Chargement...',
    reconnecting: 'Reconnexion en cours...',
  },
};

// ========================================
// UTILITY FUNCTIONS AMÉLIORÉES
// ========================================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('❌ Erreur formatTime:', error);
    return '';
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch (error) {
    console.error('❌ Erreur formatDate:', error);
    return '';
  }
};

const logError = (context, error, additionalInfo = {}) => {
  console.error(`❌ [${context}]`, {
    message: error.message,
    code: error.code,
    response: error.response?.data,
    status: error.response?.status,
    ...additionalInfo,
  });
};

// ========================================
// API SERVICE AMÉLIORÉ AVEC MEILLEUR DEBUG
// ========================================
class ChatAPI {
  static baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  static async makeRequest(endpoint, options = {}, attempt = 1) {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`📤 [API-${requestId}] ${options.method || 'GET'} ${endpoint}`, {
      attempt,
      hasAuth: !!options.headers?.Authorization,
      timeout: options.timeout || CONFIG.API_TIMEOUT,
    });

    try {
      const response = await axios({
        url: `${this.baseURL}${endpoint}`,
        timeout: options.timeout || CONFIG.API_TIMEOUT,
        ...options,
      });

      console.log(`✅ [API-${requestId}] Success:`, {
        status: response.status,
        dataLength: JSON.stringify(response.data).length,
      });

      return response.data;
    } catch (error) {
      logError(`API-${requestId}`, error, {
        endpoint,
        attempt,
        maxAttempts: CONFIG.RETRY_ATTEMPTS,
      });

      // Session expirée
      if (error.response?.status === 401) {
        console.warn('🔐 Session expirée détectée');
        throw new Error(MESSAGES.errors.sessionExpired);
      }

      // Erreur serveur (5xx)
      if (error.response?.status >= 500) {
        console.warn('🔥 Erreur serveur détectée');
        throw new Error(MESSAGES.errors.apiError);
      }

      // Erreur 404 - endpoint non trouvé
      if (error.response?.status === 404) {
        console.warn('⚠️ Endpoint non trouvé:', endpoint);
        throw new Error(`L'endpoint ${endpoint} n'existe pas sur le serveur`);
      }

      // Timeout ou erreur réseau
      if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response) {
        if (attempt < CONFIG.RETRY_ATTEMPTS) {
          const delay = CONFIG.RETRY_DELAY * attempt;
          console.log(`🔄 Retry ${attempt}/${CONFIG.RETRY_ATTEMPTS} après ${delay}ms...`);
          await sleep(delay);
          return this.makeRequest(endpoint, options, attempt + 1);
        }
        throw new Error(MESSAGES.errors.networkError);
      }

      throw error;
    }
  }

  static async loadConnections(token) {
    return this.makeRequest('/api/contacts/conversations', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  static async loadContactsStats(token) {
    return this.makeRequest('/api/contacts/stats', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  static async uploadFile(file, token, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const uploadId = `upload-${Date.now()}`;
    console.log(`📤 [${uploadId}] Début upload:`, {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    try {
      const response = await fetch(`${this.baseURL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ [${uploadId}] Upload réussi:`, data);
      return data;
    } catch (error) {
      logError(uploadId, error);
      throw error;
    }
  }
}

// ========================================
// ERROR BOUNDARY COMPONENT
// ========================================
const ErrorDisplay = ({ error, onRetry }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3"
  >
    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="text-red-400 font-medium mb-1">Erreur</p>
      <p className="text-red-300 text-sm">{error}</p>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-medium flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Réessayer
      </button>
    )}
  </motion.div>
);

// ========================================
// CONNECTION STATUS INDICATOR
// ========================================
const ConnectionStatus = ({ connected, reconnecting }) => {
  if (connected && !reconnecting) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-gray-400 text-sm">En ligne</span>
      </div>
    );
  }

  if (reconnecting) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        <span className="text-yellow-400 text-sm">Reconnexion...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-red-500" />
      <span className="text-red-400 text-sm">Hors ligne</span>
    </div>
  );
};

// ========================================
// MAIN COMPONENT OPTIMISÉ
// ========================================
export default function ModernChatApp() {
  const { user, token, updateUser } = useAuth();
  
  // States groupés pour réduire re-renders
  const [uiState, setUiState] = useState({
    showContactsSync: false,
    showPhoneModal: false,
    showForward: false,
    isLoading: false,
    isUploading: false,
    searchQuery: "",
  });

  const [dataState, setDataState] = useState({
    connections: [],
    messages: [],
    unreadCounts: {},
    contactsStats: null,
  });

  const [selectedState, setSelectedState] = useState({
    friend: null,
    message: null,
  });

  const [errorState, setErrorState] = useState({
    loadError: null,
    sendError: null,
  });

  const [newMessage, setNewMessage] = useState("");
  const [toast, setToast] = useState(null);
  const [reconnecting, setReconnecting] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const {
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
    socket,
    on,
    off,
  } = useChatSocket(token, user?.id);

  // ========================================
  // OPTIMISATION: MEMOIZED CALLBACKS
  // ========================================
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  const clearError = useCallback((errorType) => {
    setErrorState(prev => ({ ...prev, [errorType]: null }));
  }, []);

  // ========================================
  // SYSTÈME DE RECONNEXION AUTOMATIQUE
  // ========================================
  useEffect(() => {
    if (!connected && !reconnecting && token) {
      if (reconnectAttemptsRef.current < CONFIG.MAX_RECONNECT_ATTEMPTS) {
        setReconnecting(true);
        reconnectAttemptsRef.current += 1;

        console.log(`🔄 Tentative de reconnexion ${reconnectAttemptsRef.current}/${CONFIG.MAX_RECONNECT_ATTEMPTS}...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnecting(false);
        }, CONFIG.RECONNECT_INTERVAL);
      } else {
        console.error('❌ Nombre maximum de tentatives de reconnexion atteint');
        showToast('Impossible de se reconnecter. Rechargez la page.', 'error');
      }
    } else if (connected && reconnectAttemptsRef.current > 0) {
      reconnectAttemptsRef.current = 0;
      setReconnecting(false);
      showToast(MESSAGES.success.reconnected, 'success');
      console.log('✅ Reconnexion réussie');
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connected, token, showToast, reconnecting]);

  // ========================================
  // VÉRIFICATION NUMÉRO DE TÉLÉPHONE
  // ========================================
  useEffect(() => {
    if (user && !user.phone) {
      setUiState(prev => ({ ...prev, showPhoneModal: true }));
    }
  }, [user]);

  // ========================================
  // HANDLERS OPTIMISÉS
  // ========================================
  const handlePhoneSuccess = useCallback((updatedUser) => {
    updateUser(updatedUser);
    setUiState(prev => ({ ...prev, showPhoneModal: false }));
    showToast(MESSAGES.success.phoneAdded, 'success');
    
    setTimeout(() => {
      setUiState(prev => ({ ...prev, showContactsSync: true }));
    }, 1000);
  }, [updateUser, showToast]);

  const handlePhoneModalClose = useCallback(() => {
    setUiState(prev => ({ ...prev, showPhoneModal: false }));
  }, []);

  // ========================================
  // CALL STATE MANAGEMENT
  // ========================================
  const [callState, setCallState] = useState({
    isActive: false,
    type: null,
    friend: null,
    isMuted: false,
    isVideoEnabled: true,
  });

  const handleCallStateChange = useCallback((callInfo) => {
    console.log('📞 État d\'appel changé:', callInfo);
    setCallState(callInfo);
  }, []);

  const handleCallError = useCallback((error) => {
    console.error('❌ Erreur d\'appel:', error);
    showToast(`Erreur d'appel: ${error.message}`, 'error');
  }, [showToast]);

  // ========================================
  // MEMOIZED VALUES OPTIMISÉS
  // ========================================
  const filteredConnections = useMemo(() => {
    const { searchQuery } = uiState;
    const { connections } = dataState;
    
    if (!searchQuery.trim()) return connections;
    
    const query = searchQuery.toLowerCase();
    return connections.filter(conn => 
      conn.fullName?.toLowerCase().includes(query) ||
      conn.phone?.includes(query)
    );
  }, [dataState.connections, uiState.searchQuery]);

  const sortedConnections = useMemo(() => {
    const { unreadCounts } = dataState;
    
    return [...filteredConnections].sort((a, b) => {
      const aUnread = unreadCounts[a.id] || 0;
      const bUnread = unreadCounts[b.id] || 0;
      
      if (aUnread !== bUnread) return bUnread - aUnread;
      
      const aOnline = onlineUsers.includes(a.id);
      const bOnline = onlineUsers.includes(b.id);
      
      if (aOnline !== bOnline) return bOnline - aOnline;
      
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
  }, [filteredConnections, dataState.unreadCounts, onlineUsers]);

  // ========================================
  // LOAD DATA AVEC MEILLEURE GESTION D'ERREURS
  // ========================================
  const loadData = useCallback(async (showLoadingToast = false) => {
    if (!token) {
      console.warn('⚠️ Pas de token disponible pour charger les données');
      return;
    }

    if (showLoadingToast) {
      showToast(MESSAGES.info.loading, 'info');
    }

    clearError('loadError');

    try {
      console.log('📥 Chargement des données...');
      
      const [connectionsData, statsData] = await Promise.all([
        ChatAPI.loadConnections(token).catch((err) => {
          // Si les endpoints n'existent pas, on continue avec des données vides
          if (err.message.includes("n'existe pas")) {
            console.warn('⚠️ API contacts non disponible, mode dégradé');
            return { connections: [] };
          }
          throw err;
        }),
        ChatAPI.loadContactsStats(token).catch((err) => {
          console.warn('⚠️ Échec chargement stats (non-bloquant):', err.message);
          return null;
        }),
      ]);

      console.log('✅ Données chargées:', {
        connections: connectionsData.connections?.length || 0,
        stats: statsData ? 'OK' : 'N/A',
      });

      setDataState(prev => ({
        ...prev,
        connections: connectionsData.connections || [],
        contactsStats: statsData,
      }));

      // Si aucune connexion et API non disponible, informer l'utilisateur
      if (connectionsData.connections?.length === 0) {
        showToast('💡 Synchronisez vos contacts pour commencer', 'info');
      }

    } catch (err) {
      logError('LoadData', err);
      
      // Message d'erreur adapté
      let errorMessage = err.message;
      if (err.message.includes("n'existe pas")) {
        errorMessage = 'Le serveur ne supporte pas encore la messagerie. Contactez l\'administrateur.';
      }
      
      setErrorState(prev => ({
        ...prev,
        loadError: errorMessage,
      }));
      showToast(errorMessage, 'error');
    }
  }, [token, showToast, clearError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ========================================
  // SOCKET EVENT HANDLERS OPTIMISÉS
  // ========================================
  useEffect(() => {
    if (!connected) return;

    const handlers = {
      receiveMessage: (message) => {
        console.log('📨 Message reçu:', {
          id: message._id,
          from: message.sender._id || message.sender,
          hasContent: !!message.content,
          hasFile: !!message.file,
        });
        
        const senderId = message.sender._id || message.sender;
        
        if (selectedState.friend && (senderId === selectedState.friend.id || message.recipient === selectedState.friend.id)) {
          setDataState(prev => ({
            ...prev,
            messages: [...prev.messages, message],
          }));
          
          if (senderId === selectedState.friend.id) {
            markAsRead(selectedState.friend.id);
          }
        } else {
          setDataState(prev => ({
            ...prev,
            unreadCounts: {
              ...prev.unreadCounts,
              [senderId]: (prev.unreadCounts[senderId] || 0) + 1,
            },
          }));
        }
        
        playReceiveSound();
      },

      messageSent: (message) => {
        console.log('✅ Message confirmé:', message._id);
        clearError('sendError');
      },

      conversationLoaded: ({ messages: loadedMessages }) => {
        console.log('✅ Conversation chargée:', {
          count: loadedMessages.length,
          oldest: loadedMessages[0]?.createdAt,
          newest: loadedMessages[loadedMessages.length - 1]?.createdAt,
        });
        
        setDataState(prev => ({ ...prev, messages: loadedMessages }));
        setUiState(prev => ({ ...prev, isLoading: false }));
      },

      messageDeleted: ({ messageId, forEveryone }) => {
        console.log('🗑️ Message supprimé:', { messageId, forEveryone });
        setDataState(prev => ({
          ...prev,
          messages: prev.messages.filter(m => m._id !== messageId),
        }));
        showToast(
          forEveryone ? MESSAGES.success.messageDeletedForAll : MESSAGES.success.messageDeleted,
          'success'
        );
      },

      unreadCounts: (counts) => {
        const countsObj = {};
        counts.forEach(({ _id, count }) => {
          countsObj[_id] = count;
        });
        setDataState(prev => ({ ...prev, unreadCounts: countsObj }));
      },

      unreadCountUpdate: ({ senderId, count }) => {
        setDataState(prev => ({
          ...prev,
          unreadCounts: {
            ...prev.unreadCounts,
            [senderId]: count,
          },
        }));
      },

      messagesRead: ({ readBy }) => {
        setDataState(prev => ({
          ...prev,
          messages: prev.messages.map(m =>
            (m.sender._id === user.id || m.sender === user.id) ? { ...m, read: true } : m
          ),
        }));
      },

      error: (error) => {
        console.error('❌ Erreur socket:', error);
        showToast(error.message || 'Erreur de communication', 'error');
      },
    };

    const unsubscribers = Object.entries(handlers).map(([event, handler]) => {
      const unsub = on(event, handler);
      return unsub;
    });

    getUnreadCounts();

    return () => {
      unsubscribers.forEach(unsub => unsub?.());
    };
  }, [connected, selectedState.friend, user, markAsRead, on, getUnreadCounts, showToast, clearError]);

  // ========================================
  // SELECT FRIEND OPTIMISÉ
  // ========================================
  const handleSelectFriend = useCallback((friend) => {
    console.log('👤 Sélection ami:', friend.fullName);
    setSelectedState({
      friend,
      message: null,
    });
    setDataState(prev => ({ ...prev, messages: [] }));
  }, []);

  useEffect(() => {
    if (!selectedState.friend || !connected) return;

    console.log('📂 Chargement conversation:', selectedState.friend.fullName);
    setUiState(prev => ({ ...prev, isLoading: true }));
    loadConversation(selectedState.friend.id);
    markAsRead(selectedState.friend.id);
    
    setDataState(prev => {
      const newCounts = { ...prev.unreadCounts };
      delete newCounts[selectedState.friend.id];
      return { ...prev, unreadCounts: newCounts };
    });
  }, [selectedState.friend, connected, loadConversation, markAsRead]);

  // ========================================
  // AUTO SCROLL OPTIMISÉ
  // ========================================
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: CONFIG.SCROLL_BEHAVIOR });
    }
  }, [dataState.messages]);

  // ========================================
  // SEND MESSAGE AVEC MEILLEURE GESTION D'ERREURS
  // ========================================
  const handleSend = useCallback(() => {
    if (!selectedState.friend || !newMessage.trim()) return;

    if (newMessage.length > CONFIG.MAX_MESSAGE_LENGTH) {
      showToast(MESSAGES.errors.messageToLong, 'error');
      return;
    }

    if (!connected) {
      showToast('Impossible d\'envoyer: pas de connexion', 'error');
      return;
    }

    clearError('sendError');

    const messageData = {
      recipientId: selectedState.friend.id,
      content: newMessage.trim(),
    };

    console.log('📤 Envoi message:', {
      to: selectedState.friend.fullName,
      length: messageData.content.length,
    });

    try {
      sendMessage(messageData);
      playSendSound();
      setNewMessage("");
      stopTyping(selectedState.friend.id);
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      logError('SendMessage', error);
      setErrorState(prev => ({
        ...prev,
        sendError: error.message || MESSAGES.errors.sendMessage,
      }));
      showToast(error.message || MESSAGES.errors.sendMessage, 'error');
    }
  }, [selectedState.friend, newMessage, connected, sendMessage, stopTyping, showToast, clearError]);

  // ========================================
  // TYPING HANDLER OPTIMISÉ
  // ========================================
  const handleTyping = useCallback((e) => {
    const value = e.target.value;
    setNewMessage(value);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }

    if (!selectedState.friend || !connected) return;

    startTyping(selectedState.friend.id);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(selectedState.friend.id);
    }, CONFIG.TYPING_TIMEOUT);
  }, [selectedState.friend, connected, startTyping, stopTyping]);

  // ========================================
  // FILE UPLOAD AVEC MEILLEURE GESTION
  // ========================================
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedState.friend) return;

    if (file.size > CONFIG.MAX_FILE_SIZE) {
      showToast(MESSAGES.errors.fileTooBig, 'error');
      return;
    }

    if (!CONFIG.SUPPORTED_FILE_TYPES.includes(file.type)) {
      showToast(MESSAGES.errors.unsupportedFileType, 'error');
      return;
    }

    if (!connected) {
      showToast('Impossible d\'envoyer: pas de connexion', 'error');
      return;
    }

    setUiState(prev => ({ ...prev, isUploading: true }));
    showToast(MESSAGES.info.uploading, 'info');

    try {
      const data = await ChatAPI.uploadFile(file, token);
      
      if (data.fileUrl) {
        sendMessage({
          recipientId: selectedState.friend.id,
          content: "",
          file: data.fileUrl,
        });
        showToast(MESSAGES.success.fileUploaded, 'success');
      }
    } catch (error) {
      logError('FileUpload', error);
      showToast(error.message || MESSAGES.errors.uploadFile, 'error');
    } finally {
      setUiState(prev => ({ ...prev, isUploading: false }));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [selectedState.friend, token, connected, sendMessage, showToast]);

  // ========================================
  // MESSAGE ACTIONS
  // ========================================
  const handleDelete = useCallback((forEveryone = false) => {
    if (!selectedState.message) return;
    
    console.log('🗑️ Suppression message:', {
      id: selectedState.message._id,
      forEveryone,
    });
    
    deleteMessage(selectedState.message._id, forEveryone);
    setSelectedState(prev => ({ ...prev, message: null }));
  }, [selectedState.message, deleteMessage]);

  const handleForward = useCallback((friendIds) => {
    if (!selectedState.message || friendIds.length === 0) return;
    
    console.log('➡️ Transfert message:', {
      id: selectedState.message._id,
      to: friendIds,
    });
    
    forwardMessage(selectedState.message._id, friendIds);
    setUiState(prev => ({ ...prev, showForward: false }));
    setSelectedState(prev => ({ ...prev, message: null }));
    showToast(`${MESSAGES.success.messageForwarded} à ${friendIds.length} personne(s)`, 'success');
  }, [selectedState.message, forwardMessage, showToast]);

  // ========================================
  // CALL HANDLERS
  // ========================================
  const handleStartCall = useCallback((type) => {
    if (!selectedState.friend) {
      console.warn('⚠️ Impossible de démarrer l\'appel: pas d\'ami sélectionné');
      showToast('Impossible de démarrer l\'appel', 'error');
      return;
    }

    if (!connected || !socket) {
      console.warn('⚠️ Impossible de démarrer l\'appel: pas de connexion');
      showToast('Vous devez être en ligne pour passer un appel', 'error');
      return;
    }

    console.log('📞 Démarrage appel:', {
      type,
      to: selectedState.friend.fullName,
    });

    try {
      setCallState({
        isActive: true,
        type,
        friend: selectedState.friend,
        isMuted: false,
        isVideoEnabled: type === 'video',
        status: 'calling',
      });

      // Émettre l'événement d'appel via socket
      socket.emit('call:start', {
        to: selectedState.friend.id,
        type,
        caller: user,
      });

    } catch (error) {
      logError('StartCall', error);
      showToast(`Erreur d'appel: ${error.message}`, 'error');
      setCallState({ isActive: false, type: null, friend: null });
    }
  }, [selectedState.friend, connected, socket, user, showToast]);

  const handleEndCall = useCallback(() => {
    console.log('📞 Fin d\'appel');
    
    if (socket && callState.friend) {
      socket.emit('call:end', {
        to: callState.friend.id,
      });
    }

    setCallState({
      isActive: false,
      type: null,
      friend: null,
      isMuted: false,
      isVideoEnabled: true,
    });
  }, [socket, callState.friend]);

  const handleToggleMute = useCallback(() => {
    setCallState(prev => ({
      ...prev,
      isMuted: !prev.isMuted,
    }));
  }, []);

  const handleToggleVideo = useCallback(() => {
    setCallState(prev => ({
      ...prev,
      isVideoEnabled: !prev.isVideoEnabled,
    }));
  }, []);

  // ========================================
  // SYNC CONTACTS
  // ========================================
  const handleSyncComplete = useCallback((result) => {
    console.log('✅ Synchronisation terminée:', result);
    
    if (!result) {
      setUiState(prev => ({ ...prev, showContactsSync: false }));
      return;
    }

    setUiState(prev => ({ ...prev, showContactsSync: false }));
    
    showToast(
      `${result.stats.onChantilink || 0} contact(s) trouvé(s) sur Chantilink !`,
      'success'
    );
    
    loadData();
  }, [loadData, showToast]);

  // ========================================
  // KEYBOARD SHORTCUTS
  // ========================================
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        setSelectedState(prev => ({ ...prev, message: null }));
        setUiState(prev => ({ ...prev, showForward: false }));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // ========================================
  // FORWARD MODAL COMPONENT
  // ========================================
  const ForwardModal = () => {
    const [selectedConnections, setSelectedConnections] = useState([]);

    if (!uiState.showForward) return null;

    const handleToggle = (connectionId) => {
      setSelectedConnections(prev =>
        prev.includes(connectionId)
          ? prev.filter(id => id !== connectionId)
          : [...prev, connectionId]
      );
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setUiState(prev => ({ ...prev, showForward: false }))}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Transférer à</h3>
            <button
              onClick={() => setUiState(prev => ({ ...prev, showForward: false }))}
              className="text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {dataState.connections.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Aucune connexion disponible</p>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto space-y-2 mb-4 custom-scrollbar">
                {dataState.connections.map((conn) => (
                  <label
                    key={conn.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-700/50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedConnections.includes(conn.id)}
                      onChange={() => handleToggle(conn.id)}
                      className="w-4 h-4 text-orange-500 focus:ring-orange-500 rounded"
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {conn.fullName?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-white block truncate font-medium">
                          {conn.fullName}
                        </span>
                        <span className="text-xs text-gray-400">
                          {conn.source === "contact" ? "📞 Contact" : "👥 Ami"}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setUiState(prev => ({ ...prev, showForward: false }))}
                  className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleForward(selectedConnections)}
                  disabled={selectedConnections.length === 0}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  Envoyer ({selectedConnections.length})
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    );
  };

  // ========================================
  // RENDER
  // ========================================
  return (
    <>
      <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        {/* ==================== SIDEBAR ==================== */}
        <aside className="w-80 bg-gray-800/50 backdrop-blur-xl border-r border-gray-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-bold text-white">Messages</h2>
              <button
                onClick={() => setUiState(prev => ({ ...prev, showContactsSync: true }))}
                className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg text-xs font-semibold hover:from-orange-600 hover:to-pink-600 transition shadow-lg hover:shadow-orange-500/50"
              >
                📞 Synchro
              </button>
            </div>

            <div className="flex items-center justify-between text-sm mb-3">
              <ConnectionStatus connected={connected} reconnecting={reconnecting} />
              {dataState.contactsStats && (
                <span className="text-xs text-gray-400">
                  {dataState.contactsStats.onChantilink} sur Chantilink
                </span>
              )}
            </div>

            {/* Affichage erreur de chargement */}
            {errorState.loadError && (
              <div className="mb-3">
                <ErrorDisplay 
                  error={errorState.loadError} 
                  onRetry={() => {
                    clearError('loadError');
                    loadData(true);
                  }}
                />
              </div>
            )}

            <input
              type="text"
              value={uiState.searchQuery}
              onChange={(e) => setUiState(prev => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Rechercher..."
              className="w-full px-3 py-2 bg-gray-700/50 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {sortedConnections.length === 0 ? (
              <div className="p-6 text-center">
                {uiState.searchQuery ? (
                  <>
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-gray-500">Aucun résultat</p>
                  </>
                ) : (
                  <>
                    <div className="text-4xl mb-2">👥</div>
                    <p className="text-gray-500 mb-4">Aucune conversation</p>
                    <button
                      onClick={() => setUiState(prev => ({ ...prev, showContactsSync: true }))}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg text-sm font-semibold hover:from-orange-600 hover:to-pink-600 transition"
                    >
                      Synchroniser mes contacts
                    </button>
                  </>
                )}
              </div>
            ) : (
              sortedConnections.map((conn) => {
                const isOnline = onlineUsers.includes(conn.id);
                const unreadCount = dataState.unreadCounts[conn.id] || 0;
                const isTyping = typingUsers[conn.id];
                const isSelected = selectedState.friend?.id === conn.id;

                return (
                  <motion.div
                    key={conn.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ x: 4 }}
                    onClick={() => handleSelectFriend(conn)}
                    className={`p-4 border-b border-gray-700/50 cursor-pointer transition ${
                      isSelected ? "bg-gray-700/50" : "hover:bg-gray-700/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {conn.fullName?.[0]?.toUpperCase() || "?"}
                        </div>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-800" />
                        )}
                        <div className="absolute -top-1 -right-1 text-xs">
                          {conn.source === "contact" ? "📞" : "👥"}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">
                          {conn.fullName || 'Inconnu'}
                        </p>
                        <p className="text-gray-400 text-sm truncate">
                          {isTyping ? (
                            <span className="text-orange-400 italic">En train d'écrire...</span>
                          ) : isOnline ? (
                            "En ligne"
                          ) : (
                            "Hors ligne"
                          )}
                        </p>
                      </div>

                      {unreadCount > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="bg-orange-500 text-white text-xs font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-2 flex-shrink-0"
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </aside>

        {/* ==================== CONVERSATION AREA ==================== */}
        <section className="flex-1 flex flex-col overflow-hidden">
          {selectedState.friend ? (
            <>
              {/* Chat Header avec boutons d'appel */}
              <div className="p-4 bg-gray-800/50 backdrop-blur-xl border-b border-gray-700 flex items-center gap-3 flex-shrink-0">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-lg">
                    {selectedState.friend.fullName?.[0]?.toUpperCase() || "?"}
                  </div>
                  {onlineUsers.includes(selectedState.friend.id) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold truncate">{selectedState.friend.fullName}</h3>
                  <p className="text-gray-400 text-sm">
                    {typingUsers[selectedState.friend.id] ? (
                      <span className="text-orange-400 italic">En train d'écrire...</span>
                    ) : onlineUsers.includes(selectedState.friend.id) ? (
                      "En ligne"
                    ) : (
                      "Hors ligne"
                    )}
                  </p>
                </div>

                {/* Boutons d'appel avec indication de disponibilité */}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleStartCall('video')}
                    disabled={!connected || callState.isActive}
                    className="p-2.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-xl transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    title={connected ? "Appel vidéo" : "Hors ligne"}
                  >
                    <Video className="w-5 h-5" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleStartCall('audio')}
                    disabled={!connected || callState.isActive}
                    className="p-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    title={connected ? "Appel audio" : "Hors ligne"}
                  >
                    <Phone className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {uiState.isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4" />
                      <p className="text-gray-400">Chargement des messages...</p>
                    </div>
                  </div>
                ) : dataState.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-lg font-medium">Aucun message</p>
                    <p className="text-sm">Commencez la conversation !</p>
                  </div>
                ) : (
                  dataState.messages.map((msg, index) => {
                    const isUser = (msg.sender._id || msg.sender) === user.id;
                    const isSelected = selectedState.message?._id === msg._id;
                    const showDate =
                      index === 0 ||
                      formatDate(dataState.messages[index - 1]?.timestamp || dataState.messages[index - 1]?.createdAt) !==
                        formatDate(msg.timestamp || msg.createdAt);

                    return (
                      <React.Fragment key={msg._id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 bg-gray-700/50 backdrop-blur-sm text-gray-400 text-xs rounded-full">
                              {formatDate(msg.timestamp || msg.createdAt)}
                            </span>
                          </div>
                        )}

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => setSelectedState(prev => ({ ...prev, message: msg }))}
                          className={`max-w-[70%] ${isUser ? "ml-auto" : "mr-auto"}`}
                        >
                          <div
                            className={`p-3 rounded-2xl break-words cursor-pointer transition ${
                              isUser
                                ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-br-sm"
                                : "bg-gray-700 text-white rounded-bl-sm"
                            } ${isSelected ? "ring-2 ring-blue-400 shadow-lg" : "hover:shadow-lg"}`}
                          >
                            {msg.content && <div className="whitespace-pre-wrap break-words">{msg.content}</div>}

                            {msg.file && (
                              <div className="mt-2">
                                {msg.file.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <img
                                    src={msg.file}
                                    alt="upload"
                                    className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(msg.file, "_blank");
                                    }}
                                  />
                                ) : (
                                  <a
                                    href={msg.file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span>📎</span>
                                    <span className="text-sm truncate">Fichier joint</span>
                                  </a>
                                )}
                              </div>
                            )}

                            {msg.audio && (
                              <audio
                                controls
                                src={msg.audio}
                                className="mt-2 w-full max-w-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}

                            <div className="flex items-center justify-between mt-1 text-xs opacity-70 gap-2">
                              <span>{formatTime(msg.timestamp || msg.createdAt)}</span>
                              {isUser && <span className="flex-shrink-0">{msg.read ? "✓✓" : "✓"}</span>}
                            </div>
                          </div>
                        </motion.div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Affichage erreur d'envoi */}
              {errorState.sendError && (
                <div className="px-4 pb-2">
                  <ErrorDisplay 
                    error={errorState.sendError} 
                    onRetry={() => clearError('sendError')}
                  />
                </div>
              )}

              {/* Selected Message Actions */}
              <AnimatePresence>
                {selectedState.message && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="p-3 bg-gray-800/50 backdrop-blur-xl border-t border-gray-700 flex flex-wrap gap-2 flex-shrink-0"
                  >
                    <button
                      onClick={() => handleDelete(false)}
                      className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium text-sm flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer pour moi
                    </button>
                    {(selectedState.message.sender._id === user.id || selectedState.message.sender === user.id) && (
                      <button
                        onClick={() => handleDelete(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium text-sm flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer pour tous
                      </button>
                    )}
                    <button
                      onClick={() => setUiState(prev => ({ ...prev, showForward: true }))}
                      className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium text-sm flex items-center gap-2"
                    >
                      <Forward className="w-4 h-4" />
                      Transférer
                    </button>
                    <button
                      onClick={() => setSelectedState(prev => ({ ...prev, message: null }))}
                      className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition ml-auto font-medium text-sm flex items-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Annuler
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Area */}
              <div className="p-4 bg-gray-800/50 backdrop-blur-xl border-t border-gray-700 flex items-end gap-2 flex-shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uiState.isUploading || !connected}
                  className="p-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 group"
                  title={connected ? "Envoyer un fichier" : "Hors ligne"}
                >
                  {uiState.isUploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                  ) : (
                    <Paperclip className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  disabled={uiState.isUploading || !connected}
                />

                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleTyping}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={connected ? "Écrire un message..." : "Hors ligne..."}
                  className="flex-1 resize-none rounded-xl p-3 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 max-h-32 min-h-[44px] overflow-y-auto custom-scrollbar disabled:opacity-50"
                  rows={1}
                  disabled={uiState.isUploading || !connected}
                />

                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || uiState.isUploading || !connected}
                  className="p-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-orange-500/50 flex-shrink-0 group"
                  title={connected ? "Envoyer (Enter)" : "Hors ligne"}
                >
                  <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="text-6xl mb-4">💬</div>
                <p className="text-xl mb-2 font-semibold">Sélectionnez une conversation</p>
                <p className="text-sm text-gray-400 mb-4">
                  {dataState.connections.length === 0
                    ? "Commencez par synchroniser vos contacts"
                    : "Choisissez un contact pour commencer à discuter"}
                </p>
                {dataState.connections.length === 0 && (
                  <button
                    onClick={() => setUiState(prev => ({ ...prev, showContactsSync: true }))}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-pink-600 transition shadow-lg hover:shadow-orange-500/50"
                  >
                    📞 Synchroniser mes contacts
                  </button>
                )}
              </motion.div>
            </div>
          )}
        </section>
      </div>

      {/* ==================== MODALS ==================== */}
      <AnimatePresence>
        {uiState.showPhoneModal && (
          <PhoneModal
            onSuccess={handlePhoneSuccess}
            onClose={handlePhoneModalClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uiState.showContactsSync && (
          <ContactsSync
            onClose={() => setUiState(prev => ({ ...prev, showContactsSync: false }))}
            onSyncComplete={handleSyncComplete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        <ForwardModal />
      </AnimatePresence>

      {/* ==================== CALL UI ==================== */}
      {callState.isActive && (
        <CallUI
          callInfo={callState}
          onEndCall={handleEndCall}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
        />
      )}

      {/* ==================== TOAST ==================== */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* ==================== CUSTOM SCROLLBAR STYLES ==================== */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.7);
        }
      `}</style>
    </>
  );
}