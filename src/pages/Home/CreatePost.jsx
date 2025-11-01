import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePosts } from "../../context/PostsContext";
import {
  PhotoIcon,
  MapPinIcon,
  FaceSmileIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";

// ============================================
// 🎨 Avatar simple avec photo
// ============================================
const SimpleAvatar = ({ username, profilePhoto, size = 38 }) => {
  const [imageError, setImageError] = useState(false);

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getColorFromName = (name) => {
    if (!name) return "#f97316";
    const colors = [
      "#f97316", "#ef4444", "#8b5cf6", "#3b82f6", 
      "#10b981", "#f59e0b", "#ec4899", "#6366f1"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // ✅ Gestion des URLs Cloudinary
  const getPhotoUrl = (photo) => {
    if (!photo) return null;
    // Les URLs Cloudinary commencent déjà par http/https
    if (photo.startsWith('http')) return photo;
    // Fallback pour anciennes URLs locales
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    return `${base}${photo.startsWith('/') ? photo : `/${photo}`}`;
  };

  const photoUrl = getPhotoUrl(profilePhoto);

  if (photoUrl && !imageError) {
    return (
      <img
        src={photoUrl}
        alt={username}
        className="rounded-full object-cover ring-2 ring-orange-200"
        style={{ width: size, height: size }}
        onError={() => {
          console.log('❌ Erreur chargement photo:', photoUrl);
          setImageError(true);
        }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shadow-md ring-2 ring-orange-200"
      style={{
        width: size,
        height: size,
        backgroundColor: getColorFromName(username),
        fontSize: size * 0.4,
      }}
    >
      {getInitials(username)}
    </div>
  );
};

export default function CreatePost({ user, showToast, onPostCreated }) {
  const { createPost } = usePosts();
  const fileInputRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [location, setLocation] = useState("");
  const [privacy, setPrivacy] = useState("Public");
  const [posting, setPosting] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const swipeThreshold = 50;
  const retryTimeoutRef = useRef(null);

  const emojis = [
    "😀", "😂", "😍", "😎", "😢", "👍", "🙏", "🎉",
    "❤️", "🤩", "🤔", "😱", "🥳", "💯", "✨", "🔥",
    "👏", "🎊", "💪", "🌟", "⭐", "💖", "🙌", "👌"
  ];

  const MAX_CONTENT_LENGTH = 2000;
  const MAX_MEDIA_COUNT = 5;
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
  const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

  // ============================================
  // 🖼️ Génération des previews
  // ============================================
  useEffect(() => {
    if (mediaFiles.length === 0) {
      setPreviewUrls([]);
      return;
    }

    const urls = mediaFiles.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      type: f.type.startsWith("video") ? "video" : "image"
    }));

    setPreviewUrls(urls);

    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u.url));
    };
  }, [mediaFiles]);

  // ============================================
  // 🧹 Nettoyage
  // ============================================
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // ============================================
  // 🔄 Reset du formulaire
  // ============================================
  const resetForm = useCallback(() => {
    setContent("");
    setMediaFiles([]);
    setPreviewUrls([]);
    setLocation("");
    setPrivacy("Public");
    setIsOpen(false);
    setShowEmoji(false);
    setShowLocation(false);
    setDragOver(false);
    setCurrentIndex(0);
    setUploadProgress(0);
  }, []);

  // ============================================
  // 📁 Validation et ajout de fichiers
  // ============================================
  const validateFile = useCallback((file) => {
    const isVideo = file.type.startsWith("video");
    const isImage = file.type.startsWith("image");

    if (!isVideo && !isImage) {
      return { valid: false, error: "Type de fichier non supporté" };
    }

    if (isImage && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { valid: false, error: "Format image non autorisé (JPG, PNG, WebP uniquement)" };
    }

    if (isVideo && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return { valid: false, error: "Format vidéo non autorisé (MP4, WebM, MOV uniquement)" };
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = isVideo ? "200 Mo" : "5 Mo";
      return { valid: false, error: `Fichier trop lourd. Maximum ${maxSizeMB}` };
    }

    return { valid: true };
  }, []);

  const handleFiles = useCallback(
    (files) => {
      if (!files || files.length === 0) return;

      const remainingSlots = MAX_MEDIA_COUNT - mediaFiles.length;
      if (remainingSlots <= 0) {
        showToast?.(`Maximum ${MAX_MEDIA_COUNT} fichiers autorisés`, "error");
        return;
      }

      const newFiles = Array.from(files).slice(0, remainingSlots);
      const validFiles = [];

      for (const file of newFiles) {
        const validation = validateFile(file);
        if (!validation.valid) {
          showToast?.(validation.error, "error");
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        setMediaFiles((prev) => [...prev, ...validFiles]);
        showToast?.(`${validFiles.length} fichier(s) ajouté(s)`, "success");
      }
    },
    [mediaFiles.length, validateFile, showToast]
  );

  const handleMediaChange = (e) => handleFiles(e.target.files);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const removeMedia = useCallback(
    (index) => {
      setMediaFiles((prev) => prev.filter((_, i) => i !== index));
      if (currentIndex >= index && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      showToast?.("Fichier supprimé", "success");
    },
    [currentIndex, showToast]
  );

  // ==========================================
  // 📤 Publication avec Cloudinary
  // ==========================================
  const handlePost = async (retryCount = 0) => {
    if (posting) return;

    // ✅ Validations
    if (!user) {
      showToast?.("Vous devez être connecté pour publier", "error");
      return;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent && mediaFiles.length === 0) {
      showToast?.("Votre post est vide. Ajoutez du texte ou des médias.", "error");
      return;
    }

    if (trimmedContent.length > MAX_CONTENT_LENGTH) {
      showToast?.(`Texte trop long (max ${MAX_CONTENT_LENGTH} caractères)`, "error");
      return;
    }

    setPosting(true);
    setUploadProgress(10);

    try {
      // 📤 Préparation FormData pour Cloudinary
      const formData = new FormData();
      formData.append("content", trimmedContent);
      if (location.trim()) formData.append("location", location.trim());
      formData.append("privacy", privacy);
      
      // ✅ Ajout des fichiers (Cloudinary les gère côté backend)
      mediaFiles.forEach((file) => {
        formData.append("media", file);
      });

      setUploadProgress(30);

      // 🔹 Appel createPost du context
      // Le backend s'occupe de l'upload vers Cloudinary
      const newPost = await createPost(formData);

      setUploadProgress(100);

      // 🔄 Reset form
      resetForm();
      showToast?.("Post publié avec succès ! 🎉", "success");

      // ✅ Les URLs Cloudinary sont déjà dans newPost.media
      if (onPostCreated) onPostCreated({ ...newPost, user });
    } catch (err) {
      console.error("❌ Erreur publication:", err);

      // 🔁 Retry automatique (max 2 fois)
      if (retryCount < 2 && !err.message?.includes("401")) {
        showToast?.(`Nouvelle tentative (${retryCount + 1}/2)...`, "info");
        retryTimeoutRef.current = setTimeout(() => {
          handlePost(retryCount + 1);
        }, 2000 * (retryCount + 1));
        return;
      }

      const errorMsg = err.message?.includes("401")
        ? "Session expirée. Reconnectez-vous."
        : err.message || "La publication a échoué. Réessayez.";

      showToast?.(errorMsg, "error");
    } finally {
      setPosting(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  // ============================================
  // 👆 Gestion swipe pour preview médias
  // ============================================
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const onTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) < swipeThreshold || previewUrls.length <= 1) return;

    if (distance > 0) {
      setCurrentIndex((prev) => (prev + 1) % previewUrls.length);
    } else {
      setCurrentIndex((prev) => (prev - 1 + previewUrls.length) % previewUrls.length);
    }
  };

  // ============================================
  // 🎨 Render
  // ============================================
  if (!user) {
    return (
      <div className="text-center py-6 text-orange-500 font-medium">
        Connectez-vous pour publier un post
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 p-4 space-y-4"
    >
      {!isOpen ? (
        // Mode collapsed avec avatar et photo
        <motion.div
          onClick={() => setIsOpen(true)}
          className="cursor-pointer flex items-center gap-3 p-3 border border-orange-300 rounded-2xl hover:bg-orange-50 transition group"
        >
          <div className="flex-shrink-0">
            <SimpleAvatar
              username={user?.username || user?.fullName}
              profilePhoto={user?.profilePhoto}
              size={42}
            />
          </div>
          <span className="text-gray-500 font-medium group-hover:text-orange-600 transition">
            Quoi de neuf, {user?.username || user?.fullName} ?
          </span>
        </motion.div>
      ) : (
        // Mode expanded
        <AnimatePresence>
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="space-y-3"
          >
            {/* Header avec avatar */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <SimpleAvatar
                username={user?.username || user?.fullName}
                profilePhoto={user?.profilePhoto}
                size={42}
              />
              <div>
                <p className="font-semibold text-gray-800">{user?.fullName || user?.username}</p>
                <p className="text-xs text-gray-500">Créer une publication</p>
              </div>
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                placeholder="Exprimez-vous..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-4 border border-orange-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                rows={4}
                disabled={posting}
                maxLength={MAX_CONTENT_LENGTH}
              />
              <div className="flex justify-between items-center mt-1 px-2">
                <p
                  className={`text-xs ${
                    content.length > MAX_CONTENT_LENGTH * 0.9
                      ? "text-red-500"
                      : "text-gray-400"
                  }`}
                >
                  {content.length}/{MAX_CONTENT_LENGTH}
                </p>
              </div>
            </div>

            {/* Zone drag & drop médias */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              className={`relative w-full min-h-64 border-2 border-dashed rounded-2xl flex justify-center items-center p-4 transition-all cursor-pointer ${
                dragOver
                  ? "border-orange-500 bg-orange-50 scale-[1.02]"
                  : "border-gray-300 bg-gray-50"
              } ${posting ? "opacity-50 pointer-events-none" : ""}`}
              onClick={() => !posting && fileInputRef.current?.click()}
            >
              {previewUrls.length === 0 ? (
                <div className="text-center space-y-2">
                  <PhotoIcon className="w-12 h-12 mx-auto text-gray-400" />
                  <p className="text-gray-400 font-medium">
                    Glissez & déposez vos médias ici
                  </p>
                  <p className="text-xs text-gray-500">
                    ou cliquez pour parcourir (max {MAX_MEDIA_COUNT} fichiers)
                  </p>
                </div>
              ) : (
                <div className="relative w-full h-64 overflow-hidden rounded-2xl">
                  <AnimatePresence mode="wait">
                    {previewUrls.map(
                      (item, i) =>
                        i === currentIndex && (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0"
                          >
                            {item.type === "image" ? (
                              <img
                                src={item.url}
                                alt="preview"
                                className="w-full h-full object-cover rounded-2xl"
                              />
                            ) : (
                              <video
                                src={item.url}
                                controls
                                className="w-full h-full object-cover rounded-2xl"
                              />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMedia(i);
                              }}
                              className="absolute top-2 right-2 bg-white/90 hover:bg-white text-red-600 rounded-full p-2 shadow-lg transition"
                              disabled={posting}
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          </motion.div>
                        )
                    )}
                  </AnimatePresence>
                </div>
              )}

              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                accept="image/*,video/*"
                multiple
                onChange={handleMediaChange}
                disabled={posting || mediaFiles.length >= MAX_MEDIA_COUNT}
              />
            </div>

            {/* Barre de progression upload */}
            {uploadProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  className="bg-orange-500 h-full rounded-full"
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {/* Actions boutons */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setShowLocation(!showLocation)}
                className={`flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-2xl hover:bg-orange-100 transition ${
                  posting ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={posting}
              >
                <MapPinIcon className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium">Localisation</span>
              </button>

              <button
                onClick={() => setShowEmoji(!showEmoji)}
                className={`flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-2xl hover:bg-orange-100 transition ${
                  posting ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={posting}
              >
                <FaceSmileIcon className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium">Emoji</span>
              </button>

              <div className="ml-auto text-sm text-gray-500">
                {mediaFiles.length}/{MAX_MEDIA_COUNT} médias
              </div>
            </div>

            {/* Panel Emoji */}
            {showEmoji && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex flex-wrap gap-2 p-3 bg-orange-50 rounded-xl max-h-40 overflow-y-auto"
              >
                {emojis.map((e, i) => (
                  <button
                    key={i}
                    onClick={() => !posting && setContent((prev) => prev + e)}
                    className={`text-2xl hover:scale-125 transition-transform ${
                      posting ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={posting}
                  >
                    {e}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Input localisation */}
            {showLocation && (
              <motion.input
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                type="text"
                placeholder="📍 Ajouter une localisation..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-3 border border-orange-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                disabled={posting}
              />
            )}

            {/* Sélecteur confidentialité */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">
                Confidentialité :
              </label>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                disabled={posting}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="Public">🌍 Public</option>
                <option value="Friends">👥 Amis</option>
                <option value="Private">🔒 Privé</option>
              </select>
            </div>

            {/* Boutons final */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={resetForm}
                className={`px-5 py-2 bg-gray-100 text-gray-700 rounded-3xl hover:bg-gray-200 transition font-medium ${
                  posting ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={posting}
              >
                Annuler
              </button>
              <button
                onClick={() => handlePost()}
                disabled={(!content.trim() && mediaFiles.length === 0) || posting}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-3xl hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2 shadow-md"
              >
                {posting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Publication...
                  </>
                ) : (
                  "Publier"
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}