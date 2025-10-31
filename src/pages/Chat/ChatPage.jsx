// src/pages/Chat/ChatPage.jsx - VERSION COMPLÈTE CORRIGÉE
import React, { useState, useEffect, useRef } from "react";
import EmojiPicker from "emoji-picker-react";
import { FaSmile, FaTimes, FaSun, FaMoon, FaInfoCircle, FaTrash, FaPlus } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import ForwardModal from "./ForwardModal";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";

const getInitials = (name) => {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const Avatar = ({ name, isAI = false, className = "" }) => {
  const initials = isAI ? "AI" : getInitials(name);
  const bgColor = isAI 
    ? "bg-gradient-to-br from-blue-500 to-purple-600" 
    : "bg-gradient-to-br from-orange-500 to-red-600";
  
  return (
    <div className={`${className} ${bgColor} rounded-full flex items-center justify-center text-white font-bold shadow-lg`}>
      {initials}
    </div>
  );
};

const formatMarkdown = content => {
  const lines = content.split("\n");
  return lines.map((line, idx) => {
    if (line.startsWith("**") && line.endsWith("**")) {
      return <h3 key={idx} className="font-bold text-blue-500 mt-2 mb-1">{line.replace(/\*\*/g,"")}</h3>;
    }
    if (line.trim().startsWith("-")) {
      return <li key={idx} className="ml-4">{line.replace(/^- /,"")}</li>;
    }
    if (!line.trim()) return <div key={idx} className="h-1" />;
    return <p key={idx}>{line}</p>;
  });
};

const TypingDots = () => (
  <span className="inline-flex items-center ml-1">
    <span className="w-[2px] h-4 bg-blue-500 animate-pulse"></span>
  </span>
);

const AIProviderBadge = ({ provider, providers }) => {
  if (!provider) return null;

  const providerInfo = providers?.find(p => p.name === provider);
  const isActive = providerInfo?.isActive ?? true;

  const colors = {
    "OpenAI": "bg-green-500",
    "Anthropic": "bg-purple-500",
    "Gemini": "bg-blue-500",
    "Groq": "bg-orange-500",
    "Cohere": "bg-pink-500",
    "HuggingFace": "bg-yellow-500",
  };

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${colors[provider] || "bg-gray-500"} text-white`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white" : "bg-red-300"}`} />
      {provider}
    </div>
  );
};

const AIStatusPanel = ({ providers, onClose, darkMode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`absolute top-16 right-4 z-50 w-80 rounded-lg shadow-xl p-4 ${
        darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg">AI Providers Status</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <FaTimes />
        </button>
      </div>
      
      <div className="space-y-2">
        {providers.map(provider => (
          <div
            key={provider.name}
            className={`p-3 rounded-lg ${
              darkMode ? "bg-gray-700" : "bg-gray-50"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium">{provider.name}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  provider.isActive
                    ? "bg-green-500 text-white"
                    : "bg-red-500 text-white"
                }`}
              >
                {provider.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              <div>Model: {provider.model}</div>
              <div>Failures: {provider.failures || 0}</div>
            </div>
          </div>
        ))}
      </div>

      {providers.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          No providers configured
        </div>
      )}
    </motion.div>
  );
};

export default function ChatPage({ initialRoomId = null }) {
  const { user } = useAuth();
  const roomId = useRef(initialRoomId || `room-${uuidv4()}`);
  
  const { socket, isConnected, emit, on, off } = useSocket("/gpt");

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showForward, setShowForward] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [showAIStatus, setShowAIStatus] = useState(false);
  const [aiProviders, setAiProviders] = useState([]);

  const messagesEndRef = useRef(null);
  const hasJoinedRoom = useRef(false);

  const userContext = useRef({
    fullName: user?.fullName || user?.username || "User",
    email: user?.email || "",
    role: user?.role || "user",
    isPremium: user?.isPremium || false,
    location: user?.location || "",
    bio: user?.bio || "",
  }).current;

  // ========================================
  // EFFECT: REJOINDRE LA ROOM AU MOUNT
  // ========================================
  useEffect(() => {
    if (!socket || !isConnected || hasJoinedRoom.current) return;

    console.log("[ChatPage] 🎯 Rejoindre la room:", roomId.current);
    emit("joinRoom", roomId.current);
    hasJoinedRoom.current = true;

    return () => {
      if (socket && roomId.current) {
        console.log("[ChatPage] 👋 Quitter la room:", roomId.current);
        emit("leaveRoom", roomId.current);
        hasJoinedRoom.current = false;
      }
    };
  }, [socket, isConnected, emit]);

  // ========================================
  // EFFECT: ÉCOUTE DES ÉVÉNEMENTS SOCKET
  // ========================================
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log("[ChatPage] ⏳ En attente de la connexion socket...");
      return;
    }

    console.log("[ChatPage] ✅ Socket /gpt connecté, configuration des listeners");

    const handleRoomJoined = ({ roomId: joinedRoomId, messageCount }) => {
      console.log(`[ChatPage] ✅ Room rejointe: ${joinedRoomId} (${messageCount} messages)`);
      emit("getAIStatus");
    };

    const handleGPTMessage = ({ replyId, role, content, typing, provider }) => {
      setMessages(prev => {
        const index = prev.findIndex(m => m._id === replyId);
        
        if (index !== -1) {
          // Message existant - mise à jour
          const updated = [...prev];
          
          if (typing && content) {
            // Ajouter le contenu au message existant
            updated[index] = { 
              ...updated[index], 
              content: updated[index].content + content,
              typing: true,
              provider: provider || updated[index].provider
            };
          } else if (!typing) {
            // Fin du streaming - marquer comme terminé
            updated[index] = { 
              ...updated[index], 
              typing: false,
              provider: provider || updated[index].provider
            };
            console.log(`[ChatPage] ✅ Message complet reçu (${updated[index].content.length} caractères)`);
          }
          
          return updated;
        } else if (content) {
          // Nouveau message
          return [...prev, { 
            _id: replyId, 
            sender: "ai", 
            content, 
            typing, 
            timestamp: Date.now(),
            provider
          }];
        }
        
        return prev;
      });
    };

    const handleAIStatus = ({ providers }) => {
      console.log("[ChatPage] 📊 AI status reçu:", providers);
      setAiProviders(providers);
    };

    const handleHistoryCleared = ({ roomId: clearedRoomId }) => {
      console.log(`[ChatPage] 🗑️ Historique effacé pour: ${clearedRoomId}`);
      setMessages([]);
    };

    const handleError = ({ message, code }) => { 
      console.error(`[ChatPage] ❌ Erreur socket: ${code} - ${message}`);
      alert(`Error: ${message}`); 
    };

    on("roomJoined", handleRoomJoined);
    on("receiveGPTMessage", handleGPTMessage);
    on("aiStatus", handleAIStatus);
    on("historyCleared", handleHistoryCleared);
    on("error", handleError);

    return () => {
      console.log("[ChatPage] 🧹 Nettoyage des listeners");
      off("roomJoined", handleRoomJoined);
      off("receiveGPTMessage", handleGPTMessage);
      off("aiStatus", handleAIStatus);
      off("historyCleared", handleHistoryCleared);
      off("error", handleError);
    };
  }, [socket, isConnected, on, off, emit]);

  // ========================================
  // EFFECT: AUTO-SCROLL
  // ========================================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ========================================
  // HANDLER: ENVOYER MESSAGE
  // ========================================
  const handleSend = () => {
    if (!newMessage.trim()) {
      console.warn("[ChatPage] ⚠️ Message vide");
      return;
    }
    
    if (!isConnected) { 
      alert("Socket not connected. Please wait..."); 
      return; 
    }

    const userMsgId = `user-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;
    
    setMessages(prev => [...prev, {
      _id: userMsgId,
      sender: user._id,
      content: newMessage,
      timestamp: Date.now(),
      typing: false
    }]);

    console.log("[ChatPage] 📤 Envoi message:", {
      message: newMessage.substring(0, 50),
      replyId: aiMsgId,
      userContext: userContext.fullName
    });
    
    emit("sendChatMessage", { 
      roomId: roomId.current,
      message: newMessage,
      replyId: aiMsgId,
      userContext: userContext
    });

    setNewMessage("");

    setMessages(prev => [...prev, { 
      _id: aiMsgId, 
      sender: "ai", 
      content: "", 
      typing: true, 
      timestamp: Date.now() 
    }]);
  };

  const handleEmojiClick = e => setNewMessage(prev => prev + e.emoji);

  const handleDelete = () => { 
    if(!selectedMessage) return; 
    setMessages(prev=>prev.filter(m=>m._id!==selectedMessage._id)); 
    setSelectedMessage(null); 
    setShowForward(false); // ✅ Fermer aussi le modal si ouvert
  };
  
  const handleForward = friend => { 
    console.log("[ChatPage] 📨 Transfert vers:", friend);
    setShowForward(false); 
    setSelectedMessage(null); 
  };

  // ✅ Clic en dehors d'un message pour désélectionner
  const handleClickOutside = () => {
    if (selectedMessage) {
      setSelectedMessage(null);
      setShowForward(false);
    }
  };

  // ✅ Effacer l'historique
  const handleClearHistory = () => {
    if (confirm("Effacer tout l'historique de cette conversation ?")) {
      emit("clearHistory", roomId.current);
      setMessages([]);
    }
  };

  // ✅ Nouvelle conversation
  const handleNewConversation = () => {
    if (messages.length > 0 && !confirm("Commencer une nouvelle conversation ? L'historique actuel ne sera pas sauvegardé.")) {
      return;
    }
    
    // Quitter l'ancienne room
    emit("leaveRoom", roomId.current);
    hasJoinedRoom.current = false;
    
    // Créer une nouvelle room
    roomId.current = `room-${uuidv4()}`;
    setMessages([]);
    
    // Rejoindre la nouvelle room
    emit("joinRoom", roomId.current);
    hasJoinedRoom.current = true;
    
    console.log("[ChatPage] 🆕 Nouvelle conversation:", roomId.current);
  };

  const bgClass = darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800";
  const msgUserClass = darkMode ? "bg-orange-600 text-white" : "bg-orange-400 text-white";
  const msgAIClass = darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800 shadow";

  return (
    <div className={`h-full flex flex-col ${bgClass} overflow-hidden`}>
      
      {/* ========================================
          STYLES PERSONNALISÉS POUR LE SCROLLBAR
          ======================================== */}
      <style>{`
        /* Scrollbar moderne et élégant */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${darkMode ? '#1f2937' : '#f3f4f6'};
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #f97316 0%, #ea580c 100%);
          border-radius: 10px;
          transition: all 0.3s ease;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #ea580c 0%, #c2410c 100%);
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: linear-gradient(180deg, #c2410c 0%, #9a3412 100%);
        }

        /* Pour Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #f97316 ${darkMode ? '#1f2937' : '#f3f4f6'};
        }
      `}</style>
      
      {/* ========================================
          HEADER AVEC GESTION CONVERSATIONS
          ======================================== */}
      <div className={`flex-none p-4 shadow-md border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Avatar name="Artificial Intelligence" isAI={true} className="w-10 h-10 text-sm" />
            <div>
              <h1 className="font-bold text-lg">AI Construction Assistant</h1>
              <span className={`text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                {isConnected ? '● Online' : '○ Connecting...'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* ✅ Bouton Nouvelle Conversation */}
            <button 
              onClick={handleNewConversation}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                darkMode 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "bg-green-500 hover:bg-green-600 text-white"
              }`}
              title="Nouvelle conversation"
            >
              <FaPlus /> Nouveau
            </button>

            {/* ✅ Bouton Effacer Historique */}
            <button 
              onClick={handleClearHistory}
              disabled={messages.length === 0}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                messages.length === 0
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : darkMode 
                    ? "bg-red-600 hover:bg-red-700 text-white" 
                    : "bg-red-500 hover:bg-red-600 text-white"
              }`}
              title="Effacer l'historique"
            >
              <FaTrash /> Effacer
            </button>

            <button 
              onClick={() => {
                setShowAIStatus(!showAIStatus);
                emit("getAIStatus");
              }}
              className={`p-2 rounded-full transition-colors relative ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
              title="Statut des providers IA"
            >
              <FaInfoCircle className="text-xl text-blue-400"/>
              {aiProviders.some(p => !p.isActive) && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>

            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
              title="Thème"
            >
              {darkMode ? <FaSun className="text-xl text-yellow-400"/> : <FaMoon className="text-xl text-gray-600"/>}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAIStatus && (
          <AIStatusPanel 
            providers={aiProviders} 
            onClose={() => setShowAIStatus(false)}
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>

      {/* ========================================
          ZONE DES MESSAGES
          ======================================== */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar"
        onClick={handleClickOutside}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: darkMode ? '#f97316 #1f2937' : '#f97316 #e5e7eb'
        }}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Avatar name="AI" isAI={true} className="w-20 h-20 text-2xl mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Bienvenue sur l'Assistant IA</h2>
              <p className="text-gray-500">Posez-moi vos questions sur la construction, l'ingénierie ou la gestion de projet</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map(msg => {
              const isUser = msg.sender === user._id;
              const isAI = msg.sender === "ai";
              
              return (
                <motion.div 
                  key={msg._id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, scale: 0.95 }} 
                  transition={{ duration: 0.2 }}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-start gap-3`}
                >
                  {isAI && (
                    <Avatar name="AI" isAI={true} className="w-8 h-8 text-xs flex-shrink-0" />
                  )}
                  
                  <div 
                    onClick={(e) => {
                      e.stopPropagation(); // ✅ Empêcher la propagation au parent
                      setSelectedMessage(msg);
                    }} 
                    className={`group max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`px-4 py-3 rounded-2xl break-words relative transition-all ${
                      isUser 
                        ? msgUserClass + ' rounded-br-sm' 
                        : msgAIClass + ' rounded-bl-sm border ' + (darkMode ? "border-gray-700" : "border-gray-200")
                    } ${
                      selectedMessage?._id === msg._id ? 'ring-2 ring-blue-400' : ''
                    } hover:shadow-lg cursor-pointer`}>
                      {msg.content && (
                        isAI 
                          ? <div className="prose prose-sm dark:prose-invert max-w-none">
                              {formatMarkdown(msg.content)}
                              {msg.typing && <TypingDots/>}
                            </div>
                          : <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}

                      {isAI && msg.provider && !msg.typing && (
                        <div className="mt-2">
                          <AIProviderBadge provider={msg.provider} providers={aiProviders} />
                        </div>
                      )}
                    </div>
                    
                    <div className={`text-[10px] mt-1 px-1 ${darkMode ? "text-gray-500" : "text-gray-400"} ${isUser ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.timestamp || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  
                  {isUser && (
                    <Avatar name={userContext.fullName} className="w-8 h-8 text-xs flex-shrink-0" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef}/>
        </div>
      </div>

      {/* ========================================
          ACTIONS SUR MESSAGE SÉLECTIONNÉ
          ======================================== */}
      <AnimatePresence>
        {selectedMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }} 
            className={`flex-none px-4 py-3 flex gap-2 justify-center border-t ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
          >
            <button 
              onClick={handleDelete} 
              className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-lg"
            >
              <FaTimes/> Supprimer
            </button>
            <button 
              onClick={() => setShowForward(true)} 
              className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors text-sm font-medium shadow-lg"
            >
              Transférer
            </button>
            <button 
              onClick={() => setSelectedMessage(null)} 
              className={`px-4 py-2 rounded-full transition-colors text-sm font-medium ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
            >
              Annuler
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================
          ZONE DE SAISIE
          ======================================== */}
      <div className={`flex-none border-t ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-lg`}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-end gap-2 relative">
            
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 z-50">
                <EmojiPicker 
                  onEmojiClick={handleEmojiClick} 
                  theme={darkMode ? "dark" : "light"}
                />
              </div>
            )}
            
            <button 
              onClick={() => setShowEmojiPicker(prev => !prev)} 
              className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`} 
              title="Emojis"
            >
              <FaSmile className="text-xl"/>
            </button>
            
            <textarea 
              rows={1} 
              value={newMessage} 
              onChange={e => setNewMessage(e.target.value)} 
              placeholder="Posez votre question..." 
              className={`flex-1 resize-none rounded-2xl px-4 py-3 border-2 transition-all max-h-32 ${
                darkMode 
                  ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-orange-500" 
                  : "border-gray-300 bg-white text-gray-800 placeholder-gray-400 focus:border-orange-500"
              } focus:outline-none`} 
              onKeyDown={e => { 
                if (e.key === "Enter" && !e.shiftKey) { 
                  e.preventDefault(); 
                  handleSend(); 
                } 
              }} 
              style={{ minHeight: '48px', lineHeight: '1.5' }}
              disabled={!isConnected}
            />
            
            <button 
              onClick={handleSend} 
              disabled={!isConnected || !newMessage.trim()} 
              className={`px-6 py-3 rounded-full font-medium transition-all flex items-center gap-2 shadow-lg ${
                isConnected && newMessage.trim()
                  ? 'bg-orange-500 hover:bg-orange-600 text-white transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Envoyer
            </button>
          </div>
        </div>
      </div>

      {/* ========================================
          MODAL DE TRANSFERT
          ======================================== */}
      {showForward && selectedMessage && (
        <ForwardModal 
          isOpen={showForward} 
          onClose={() => {
            setShowForward(false);
            setSelectedMessage(null);
          }} 
          friends={[]} 
          onSelectFriend={handleForward}
        />
      )}
    </div>
  );
}