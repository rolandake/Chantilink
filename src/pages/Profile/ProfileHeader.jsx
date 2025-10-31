// src/pages/profile/ProfileHeader.jsx - VERSION FINALE
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { FiCamera } from "react-icons/fi";
import { FaCheckCircle, FaCrown } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

// ============================================
// 🎨 TOAST COMPONENT INTÉGRÉ
// ============================================
const InlineToast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-orange-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md"
    >
      <span className="text-2xl">✅</span>
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-white/80 hover:text-white transition"
      >
        ✕
      </button>
    </motion.div>
  );
};

export default function ProfileHeader({ user: propUser, isOwner }) {
  // ✅ DESTRUCTURATION CORRECTE
  const { user: authUser, updateUserImages } = useAuth();

  const [files, setFiles] = useState({ profile: null, cover: null });
  const [previews, setPreviews] = useState({ profile: null, cover: null });
  const [hover, setHover] = useState({ profile: false, cover: false });
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const pulseControls = useAnimation();
  const mountedRef = useRef(true);

  const currentUser = useMemo(() => propUser || authUser, [propUser, authUser]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      pulseControls.stop();
    };
  }, [pulseControls]);

  useEffect(() => {
    if (authUser?._id && mountedRef.current) {
      setPreviews((prev) => ({
        profile: authUser.profilePhoto || prev.profile,
        cover: authUser.coverPhoto || prev.cover,
      }));
    }
  }, [authUser?.profilePhoto, authUser?.coverPhoto, authUser?._id]);

  useEffect(() => {
    if (currentUser?._id && mountedRef.current) {
      setPreviews({
        profile: currentUser.profilePhoto || null,
        cover: currentUser.coverPhoto || null,
      });
    }
  }, [currentUser?._id, currentUser?.profilePhoto, currentUser?.coverPhoto]);

  useEffect(() => {
    const objectUrls = {};
    Object.entries(files).forEach(([type, file]) => {
      if (!file || !mountedRef.current) return;
      const objectUrl = URL.createObjectURL(file);
      objectUrls[type] = objectUrl;
      setPreviews((prev) => ({ ...prev, [type]: objectUrl }));
      showToast(`Prévisualisation ${type === 'profile' ? 'profil' : 'couverture'} prête !`);
    });

    return () => {
      Object.values(objectUrls).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn("Erreur revoke URL:", e);
        }
      });
    };
  }, [files.profile, files.cover]);

  const showToast = useCallback((msg) => {
    if (!mountedRef.current) return;
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) setToast(null);
    }, 4000);
  }, []);

  const handleFileChange = useCallback(
    (file, type) => {
      if (!file) return showToast("Aucun fichier sélectionné.");
      if (!/image\/(jpeg|jpg|png|webp)/.test(file.type))
        return showToast("Format invalide (JPEG, JPG, PNG, WEBP).");
      if (file.size > 5 * 1024 * 1024)
        return showToast("Fichier trop volumineux (max 5 Mo).");
      setFiles((prev) => ({ ...prev, [type]: file }));
    },
    [showToast]
  );

  const handleDrop = useCallback(
    (e, type) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      handleFileChange(file, type);
    },
    [handleFileChange]
  );

  const handleDragOver = (e) => e.preventDefault();

  const handleSaveImages = async () => {
    if (!files.profile && !files.cover) {
      return showToast("Aucun changement détecté.");
    }
    
    if (!currentUser?._id) {
      return showToast("Vous devez être connecté.");
    }

    // ✅ VÉRIFICATION CRITIQUE
    if (typeof updateUserImages !== 'function') {
      console.error("❌ ERREUR: updateUserImages n'est pas une fonction!");
      showToast("❌ Erreur: Fonction de mise à jour non disponible");
      return;
    }

    setIsSaving(true);
    pulseControls.start({ 
      opacity: [1, 0.7, 1], 
      transition: { repeat: Infinity, duration: 1.2 } 
    });

    try {
      const updatedUser = await updateUserImages(currentUser._id, files);

      if (!updatedUser || !mountedRef.current) {
        throw new Error("Aucune donnée utilisateur retournée");
      }

      setFiles({ profile: null, cover: null });

      if (mountedRef.current) {
        setPreviews({
          profile: updatedUser.profilePhoto || null,
          cover: updatedUser.coverPhoto || null,
        });
        showToast("✅ Images sauvegardées avec succès !");
      }

    } catch (err) {
      console.error("❌ Erreur lors de la sauvegarde :", err);
      
      if (mountedRef.current) {
        showToast("❌ Erreur lors de la sauvegarde des images.");
      }
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
        pulseControls.stop();
      }
    }
  };

  const handleImageError = useCallback(
    (e, type) => {
      e.target.src =
        type === "profile"
          ? "/images/default-profile.png"
          : "/images/default-cover.jpg";
      console.warn(`Impossible de charger l'image ${type}.`);
    },
    []
  );

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("blob:")) return url;
    if (url.startsWith("http")) return url;
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    return `${apiUrl}${url}`;
  };

  const renderImageArea = (type, isCircle = false, hoverText) => {
    const imageUrl = previews[type];
    const fullImageUrl = getImageUrl(imageUrl);

    return (
      <div
        className={`relative ${
          isCircle
            ? "w-36 h-36 -mt-20 rounded-full border-4 border-white shadow-lg overflow-hidden"
            : "w-full h-52 rounded-3xl overflow-hidden cursor-pointer"
        } bg-gradient-to-br from-orange-200 to-orange-300 flex items-center justify-center`}
        onDrop={(e) => handleDrop(e, type)}
        onDragOver={handleDragOver}
        onMouseEnter={() => isOwner && setHover((prev) => ({ ...prev, [type]: true }))}
        onMouseLeave={() => isOwner && setHover((prev) => ({ ...prev, [type]: false }))}
      >
        {fullImageUrl ? (
          <img
            key={fullImageUrl}
            src={fullImageUrl}
            alt={type}
            className={`w-full h-full object-cover ${isCircle ? "rounded-full" : "rounded-3xl"}`}
            onError={(e) => handleImageError(e, type)}
          />
        ) : (
          <div className="text-orange-600 text-4xl">{isCircle ? "👤" : "🖼️"}</div>
        )}

        {isOwner && hover[type] && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center ${
              isCircle ? "rounded-full bg-black/40" : "bg-orange-500/50"
            } text-white font-semibold text-lg z-20 transition-all`}
          >
            <FiCamera className={isCircle ? "text-2xl mb-1" : "text-3xl mb-2"} />
            <span className="text-sm">{hoverText}</span>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => handleFileChange(e.target.files[0], type)}
            />
          </div>
        )}
      </div>
    );
  };

  if (!currentUser?._id) {
    return <div className="p-6 text-center text-gray-500">Chargement du profil...</div>;
  }

  const hasChanges = files.profile || files.cover;

  return (
    <div className="profile-header flex flex-col items-center gap-4 relative">
      {renderImageArea("cover", false, "Changer la couverture")}
      {renderImageArea("profile", true, "Changer la photo")}

      <div className="flex items-center gap-3 justify-center flex-wrap">
        <h1 className="text-3xl font-bold text-gray-800">
          {currentUser.fullName || "Utilisateur"}
        </h1>
        
        {currentUser.isVerified && (
          <motion.div 
            className="flex items-center gap-1 bg-orange-100 px-3 py-1 rounded-full"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <FaCheckCircle className="text-orange-600 text-sm" />
            <span className="text-xs font-semibold text-orange-600">Certifié</span>
          </motion.div>
        )}
        
        {currentUser.isPremium && (
          <motion.div 
            className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <FaCrown className="text-yellow-600 text-sm" />
            <span className="text-xs font-semibold text-yellow-600">Premium</span>
          </motion.div>
        )}
      </div>

      {currentUser.bio && (
        <p className="text-gray-600 text-center px-4 max-w-2xl">{currentUser.bio}</p>
      )}

      <AnimatePresence>
        {isOwner && hasChanges && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={handleSaveImages}
            disabled={isSaving}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            className="px-6 py-3 rounded-xl bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Sauvegarde...
              </>
            ) : (
              <>
                <span>💾</span>
                Sauvegarder les images
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Toast intégré */}
      <AnimatePresence>
        {toast && <InlineToast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
