import React, { useState, useRef, useEffect } from "react";
import { XMarkIcon, CheckIcon, PhotoIcon, CameraIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

// Toast Component - Rendu dans un portail séparé avec protection
const Toast = ({ message, type = "success", onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!message || !mounted) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose, mounted]);

  if (!message || !mounted) return null;

  const bgColor = type === "success" ? "bg-green-500" : type === "error" ? "bg-red-600" : "bg-blue-500";
  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";

  try {
    return createPortal(
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl z-[10001] ${bgColor} text-white backdrop-blur-md border border-white/20`}
        style={{ minWidth: "300px", maxWidth: "90vw" }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{icon}</span>
            <span className="text-sm font-medium">{message}</span>
          </div>
          {onClose && (
            <button 
              onClick={onClose} 
              className="text-xl font-bold hover:bg-white/20 rounded-full w-6 h-6 flex items-center justify-center transition-all hover:rotate-90"
            >
              ✕
            </button>
          )}
        </div>
      </motion.div>,
      document.body
    );
  } catch (error) {
    console.warn('Toast portal error:', error);
    return null;
  }
};

export default function StoryCreator({ onClose, onSubmit, uploadProgress }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // 🔒 BLOQUER LE SCROLL DU BODY
  useEffect(() => {
    // Sauvegarder les styles originaux
    const originalOverflow = window.getComputedStyle(document.body).overflow;
    const originalPosition = window.getComputedStyle(document.body).position;
    const scrollY = window.scrollY;
    
    // Bloquer le scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    // Restaurer au démontage
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const handleFileSelect = (e, isVideo = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérification taille fichier
    if (file.size > 100 * 1024 * 1024) {
      setError("Fichier trop volumineux (max 100MB)");
      setToast({ message: "Fichier trop volumineux (max 100MB)", type: "error" });
      return;
    }

    const validTypes = isVideo 
      ? ["video/mp4", "video/webm", "video/quicktime"]
      : ["image/jpeg", "image/png", "image/jpg", "image/gif"];

    if (!validTypes.includes(file.type)) {
      const msg = `Format non supporté. Utilisez ${isVideo ? "MP4, WebM, MOV" : "JPG, PNG, GIF"}`;
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }

    // ✅ VÉRIFICATION DURÉE VIDÉO (15 secondes max)
    if (isVideo) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = function() {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        
        // Limite à 15 secondes (recommandé)
        if (duration > 15) {
          setError("La vidéo doit faire maximum 15 secondes ⏱️");
          setToast({ 
            message: "Vidéo trop longue ! Maximum 15 secondes pour une story impactante 🎬", 
            type: "error" 
          });
          return;
        }
        
        // Si la durée est OK, continuer
        processFile(file);
      };
      
      video.onerror = function() {
        setError("Impossible de lire la vidéo");
        setToast({ message: "Erreur lors de la lecture de la vidéo", type: "error" });
      };
      
      video.src = URL.createObjectURL(file);
    } else {
      // Pour les images, pas de vérification de durée
      processFile(file);
    }
  };

  const processFile = (file) => {
    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (!selectedFile) {
      setError("Sélectionnez une image ou vidéo");
      setToast({ message: "Sélectionnez une image ou vidéo", type: "error" });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("caption", caption.trim());
      formData.append("type", selectedFile.type.startsWith("image") ? "image" : "video");
      formData.append("visibility", "public");

      await onSubmit(formData);
      
      setToast({ message: "Story publiée avec succès! 🎉", type: "success" });
      
      // Attendre un peu avant de fermer pour que le toast soit visible
      setTimeout(() => {
        setSelectedFile(null);
        setPreview(null);
        setCaption("");
        setToast(null); // Nettoyer le toast avant de fermer
        setTimeout(() => {
          onClose();
        }, 100);
      }, 1500);
    } catch (err) {
      setError(err.message || "Erreur upload");
      setToast({ message: err.message || "Erreur lors de la publication", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setToast(null); // Nettoyer le toast avant de fermer
      setTimeout(() => {
        onClose();
      }, 50);
    }
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] flex items-center justify-center p-0 sm:p-4 overflow-hidden touch-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overscrollBehavior: 'none'
        }}
      >
        <motion.div
          className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[95vh] sm:rounded-3xl shadow-2xl flex flex-col"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          style={{ 
            overflow: 'hidden',
            overscrollBehavior: 'none'
          }}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex justify-between items-center p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-pink-50">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl">✨</span>
              Créer une story
            </h2>
            <button 
              onClick={handleClose} 
              disabled={uploading} 
              className="p-2 hover:bg-white/70 rounded-full transition disabled:opacity-50"
            >
              <XMarkIcon className="w-6 h-6 sm:w-7 sm:h-7 text-gray-600" />
            </button>
          </div>

          {/* Content - Scrollable uniquement si nécessaire, avec overscroll bloqué */}
          <div 
            className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 sm:space-y-5"
            style={{ 
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {preview ? (
              <div className="space-y-4 sm:space-y-5">
                {/* Preview - Hauteur optimisée */}
                <div className="relative rounded-2xl overflow-hidden bg-gray-900 shadow-xl" style={{ height: "min(60vh, 500px)" }}>
                  {selectedFile.type.startsWith("image") ? (
                    <img 
                      src={preview} 
                      alt="preview" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <video 
                      src={preview} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  )}
                  
                  <div className="absolute top-3 right-3 bg-black/80 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 backdrop-blur-sm">
                    <span className="text-base sm:text-lg">{selectedFile.type.startsWith("image") ? "📷" : "🎥"}</span>
                    {selectedFile.type.startsWith("image") ? "Image" : "Vidéo"}
                  </div>

                  <button
                    onClick={() => {
                      setPreview(null);
                      setSelectedFile(null);
                      setCaption("");
                    }}
                    disabled={uploading}
                    className="absolute bottom-3 left-3 bg-white/95 hover:bg-white text-gray-800 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition disabled:opacity-50 shadow-lg"
                  >
                    Changer
                  </button>
                </div>

                {/* Caption Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Légende (optionnel)
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Ajouter une légende à votre story..."
                    maxLength={200}
                    disabled={uploading}
                    className="w-full border-2 border-gray-300 rounded-xl p-3 sm:p-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none disabled:opacity-50 transition text-sm sm:text-base"
                    rows={3}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">{caption.length}/200 caractères</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 py-4 sm:py-8">
                {/* Image Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full border-3 border-dashed border-orange-300 rounded-2xl p-6 sm:p-10 text-center hover:bg-orange-50 hover:border-orange-400 transition disabled:opacity-50 group"
                >
                  <div className="flex flex-col items-center gap-3 sm:gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <PhotoIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-lg sm:text-xl">Ajouter une image</p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">JPG, PNG ou GIF (max 100MB)</p>
                    </div>
                  </div>
                </button>

                {/* Video Upload Button */}
                <button
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full border-3 border-dashed border-blue-300 rounded-2xl p-6 sm:p-10 text-center hover:bg-blue-50 hover:border-blue-400 transition disabled:opacity-50 group"
                >
                  <div className="flex flex-col items-center gap-3 sm:gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <CameraIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-lg sm:text-xl">Ajouter une vidéo</p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">MP4, WebM ou MOV</p>
                      <p className="text-xs text-orange-600 font-semibold mt-1">⏱️ Maximum 15 secondes</p>
                    </div>
                  </div>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, false)}
                  className="hidden"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileSelect(e, true)}
                  className="hidden"
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <span className="flex-1 pt-0.5">{error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && uploadProgress > 0 && (
              <div className="space-y-2 bg-gradient-to-r from-orange-50 to-pink-50 p-5 rounded-xl border border-orange-200">
                <div className="flex justify-between text-sm text-gray-700 font-medium">
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Upload en cours...
                  </span>
                  <span className="text-orange-600 font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer - Toujours visible */}
          <div className="flex-shrink-0 border-t bg-gray-50 p-4 sm:p-5 flex gap-2 sm:gap-3">
            <button
              onClick={handleClose}
              disabled={uploading}
              className="flex-1 px-4 sm:px-5 py-3 sm:py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition disabled:opacity-50 font-semibold text-sm sm:text-base"
            >
              Annuler
            </button>
            <button
              onClick={handlePublish}
              disabled={!preview || uploading}
              className="flex-1 px-4 sm:px-5 py-3 sm:py-3.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:from-orange-600 hover:to-pink-600 transition disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-400 font-semibold flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Upload...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>Publier</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Toast rendu dans un portail séparé */}
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