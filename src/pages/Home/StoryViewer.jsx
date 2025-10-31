import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useStories } from "/src/context/StoryContext.jsx";
import { createPortal } from "react-dom";

// Toast Component
const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onClose && onClose(), 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const bgColor = type === "success" ? "bg-green-500" : type === "error" ? "bg-red-600" : "bg-blue-500";
  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl z-[10000] ${bgColor} text-white backdrop-blur-md border border-white/20`}
      style={{ minWidth: "280px", maxWidth: "90vw" }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">{icon}</span>
          <span className="text-sm font-medium">{message}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-xl font-bold hover:bg-white/20 rounded-full w-6 h-6 flex items-center justify-center transition-all hover:rotate-90">
            ✕
          </button>
        )}
      </div>
    </motion.div>,
    document.body
  );
};

export default function StoryViewer({ stories, currentUser, onClose, onDelete }) {
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [reactions, setReactions] = useState({});
  const [toast, setToast] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const slideIntervalRef = useRef(null);
  const { viewSlide } = useStories();

  const currentStory = stories[currentStoryIdx];
  const currentSlide = currentStory?.slides?.[currentSlideIdx];
  const isOwner = currentUser?.id === currentStory?.owner?._id;

  // 🔒 BLOQUER LE SCROLL DU BODY
  useEffect(() => {
    // Sauvegarder les styles originaux
    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalPosition = window.getComputedStyle(document.body).position;
    const scrollY = window.scrollY;
    
    // Bloquer le scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    // Restaurer au démontage
    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.position = originalPosition;
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Gestion de la progression automatique
  useEffect(() => {
    if (!currentSlide || isPaused) return;

    const duration = currentSlide.duration || 5000;
    slideIntervalRef.current = setTimeout(() => {
      if (currentSlideIdx < currentStory.slides.length - 1) {
        setCurrentSlideIdx(prev => prev + 1);
      } else if (currentStoryIdx < stories.length - 1) {
        setCurrentStoryIdx(prev => prev + 1);
        setCurrentSlideIdx(0);
      } else {
        onClose();
      }
    }, duration);

    return () => clearTimeout(slideIntervalRef.current);
  }, [currentSlideIdx, currentSlide, currentStory, currentStoryIdx, stories, onClose, isPaused]);

  // Enregistrer la vue
  useEffect(() => {
    if (currentSlide && !isOwner) {
      viewSlide(currentStory._id, currentSlideIdx);
    }
  }, [currentSlideIdx, currentStory, currentSlide, isOwner, viewSlide]);

  const nextSlide = () => {
    if (currentSlideIdx < currentStory.slides.length - 1) {
      setCurrentSlideIdx(prev => prev + 1);
    } else if (currentStoryIdx < stories.length - 1) {
      setCurrentStoryIdx(prev => prev + 1);
      setCurrentSlideIdx(0);
    } else {
      onClose();
    }
  };

  const prevSlide = () => {
    if (currentSlideIdx > 0) {
      setCurrentSlideIdx(prev => prev - 1);
    } else if (currentStoryIdx > 0) {
      setCurrentStoryIdx(prev => prev - 1);
      setCurrentSlideIdx(stories[currentStoryIdx - 1].slides.length - 1);
    }
  };

  const handleReaction = (emoji) => {
    setReactions(prev => ({
      ...prev,
      [currentSlideIdx]: emoji
    }));
    setToast({ message: `Réaction ajoutée ${emoji}`, type: "success" });
  };

  const handleDeleteSlide = async () => {
    if (window.confirm("Supprimer cette slide ?")) {
      try {
        await onDelete(currentStory._id, currentSlideIdx);
        setToast({ message: "Slide supprimée", type: "success" });
        if (currentSlideIdx > 0) {
          setCurrentSlideIdx(prev => prev - 1);
        } else {
          nextSlide();
        }
      } catch (err) {
        setToast({ message: "Erreur suppression", type: "error" });
      }
    }
  };

  // Gestion du touch pour pause/play
  const handleTouchStart = (e) => {
    if (e.target.tagName !== 'BUTTON') {
      setIsPaused(true);
    }
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
  };

  if (!currentStory || !currentSlide) return null;

  const getMediaUrl = (media) => {
    if (!media) return null;
    if (media.startsWith('http://') || media.startsWith('https://')) {
      return media;
    }
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseUrl}${media.startsWith('/') ? '' : '/'}${media}`;
  };

  const mediaUrl = getMediaUrl(currentSlide.media);

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black z-[9999] flex items-center justify-center overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Container principal - hauteur fixe */}
        <div className="relative w-full h-full max-w-lg bg-black flex flex-col">
          
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-50 p-3 sm:p-4 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex gap-1">
              {currentStory.slides.map((_, idx) => (
                <div
                  key={idx}
                  className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm"
                >
                  <motion.div
                    initial={{ width: idx < currentSlideIdx ? "100%" : "0%" }}
                    animate={{ 
                      width: idx < currentSlideIdx 
                        ? "100%" 
                        : idx === currentSlideIdx 
                        ? isPaused ? "var(--current-width)" : "100%" 
                        : "0%" 
                    }}
                    transition={{ 
                      duration: idx === currentSlideIdx && !isPaused ? (currentSlide.duration || 5000) / 1000 : 0,
                      ease: "linear" 
                    }}
                    className="h-full bg-white rounded-full shadow-lg"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Header info */}
          <div className="absolute top-12 sm:top-14 left-0 right-0 z-50 px-3 sm:px-4">
            <div className="flex justify-between items-center">
              <motion.div 
                className="flex items-center gap-2 sm:gap-3 bg-black/40 backdrop-blur-md rounded-full pr-3 sm:pr-4 pl-1 sm:pl-1.5 py-1 sm:py-1.5"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <img
                  src={getMediaUrl(currentStory.owner?.profilePhoto) || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStory.owner?.fullName || 'U')}&background=ff6b35&color=fff`}
                  alt={currentStory.owner?.fullName}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white object-cover"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStory.owner?.fullName || 'U')}&background=ff6b35&color=fff`;
                  }}
                />
                <div className="text-white">
                  <p className="font-bold text-xs sm:text-sm flex items-center gap-1">
                    {currentStory.owner?.fullName || currentStory.owner?.username || 'Utilisateur'}
                    {currentStory.owner?.isVerified && <span className="text-blue-400 text-[10px] sm:text-xs">✓</span>}
                    {currentStory.owner?.isPremium && <span className="text-yellow-400 text-[10px] sm:text-xs">⭐</span>}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-200">
                    {currentSlide.createdAt 
                      ? new Date(currentSlide.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Maintenant'
                    }
                  </p>
                </div>
              </motion.div>

              <motion.button 
                onClick={onClose} 
                className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </motion.button>
            </div>
          </div>

          {/* Media Container - Centré et non scrollable */}
          <div className="flex-1 relative flex items-center justify-center bg-black touch-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentStoryIdx}-${currentSlideIdx}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="relative w-full h-full flex items-center justify-center"
              >
                {mediaUrl ? (
                  currentSlide.type === "image" ? (
                    <img
                      src={mediaUrl}
                      alt="story"
                      className="max-w-full max-h-full w-auto h-auto object-contain select-none"
                      draggable={false}
                    />
                  ) : (
                    <video
                      src={mediaUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="max-w-full max-h-full w-auto h-auto object-contain"
                    />
                  )
                ) : (
                  <div className="text-white text-center p-6">
                    <div className="text-5xl sm:text-6xl mb-4">🖼️</div>
                    <p className="text-base sm:text-lg font-semibold">Média non disponible</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Zones tactiles pour navigation */}
            <button 
              onClick={prevSlide} 
              className="absolute left-0 top-0 bottom-0 w-1/3 z-30 active:bg-white/5 transition-colors"
              aria-label="Slide précédente"
            />
            <button 
              onClick={nextSlide} 
              className="absolute right-0 top-0 bottom-0 w-1/3 z-30 active:bg-white/5 transition-colors"
              aria-label="Slide suivante"
            />
          </div>

          {/* Caption Text */}
          {currentSlide.text && (
            <motion.div 
              className="absolute bottom-24 sm:bottom-28 left-3 right-3 sm:left-4 sm:right-4 z-40"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-center bg-black/50 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
                <p className="text-white text-sm sm:text-base font-semibold drop-shadow-lg leading-relaxed">
                  {currentSlide.text}
                </p>
              </div>
            </motion.div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-50 px-3 sm:px-4 pb-4 sm:pb-6 bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-16">
            <motion.div 
              className="flex justify-between items-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {/* Reactions */}
              <div className="flex gap-1 sm:gap-2">
                {["❤️", "😂", "😮", "😢", "😍"].map((emoji, index) => (
                  <motion.button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`text-xl sm:text-2xl p-1.5 sm:p-2 rounded-full transition-all ${
                      reactions[currentSlideIdx] === emoji
                        ? "bg-white/30 scale-110"
                        : "hover:bg-white/10 active:scale-95"
                    }`}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>

              {/* Stats and Delete */}
              <motion.div 
                className="flex items-center gap-2 sm:gap-3 bg-black/60 backdrop-blur-md px-3 sm:px-4 py-2 rounded-full border border-white/10"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center gap-1.5 text-white text-xs sm:text-sm font-medium">
                  <span className="text-base sm:text-lg">👁️</span>
                  <span>{currentSlide.views?.length || 0}</span>
                </div>
                {isOwner && (
                  <>
                    <div className="w-px h-4 bg-white/20" />
                    <motion.button
                      onClick={handleDeleteSlide}
                      className="text-red-400 hover:text-red-300 active:scale-90 transition text-lg sm:text-xl"
                      title="Supprimer"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      🗑️
                    </motion.button>
                  </>
                )}
              </motion.div>
            </motion.div>

            {/* Pause Indicator */}
            <AnimatePresence>
              {isPaused && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 backdrop-blur-md rounded-full p-4 sm:p-5"
                >
                  <div className="text-white text-4xl sm:text-5xl">⏸️</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Toast */}
      <AnimatePresence mode="wait">
        {toast && (
          <Toast
            key={`toast-${Date.now()}`}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}