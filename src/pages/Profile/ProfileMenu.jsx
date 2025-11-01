// src/components/profile/ProfileMenu.jsx - VERSION COMPLÈTE CORRIGÉE
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useVideos } from "../../context/VideoContext";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  FaHeart, 
  FaComment, 
  FaEye, 
  FaPlay, 
  FaTrash, 
  FaShare,
  FaDownload,
  FaFlag,
  FaEdit,
  FaTimes,
  FaVolumeUp,
  FaVolumeMute,
  FaPause,
  FaBookmark,
  FaLink
} from "react-icons/fa";
import { HiDotsVertical, HiSparkles } from "react-icons/hi";

export default function ProfileMenu({ selectedTab, onSelectTab, isOwner, userId, stats }) {
  const { videos: allVideos } = useVideos();
  
  // Compter les vidéos de l'utilisateur
  const userVideosCount = useMemo(() => {
    if (!userId) return 0;
    return allVideos.filter(v => 
      (v.uploadedBy?._id || v.uploadedBy) === userId
    ).length;
  }, [allVideos, userId]);

  const tabs = ["posts", "videos", "about"];
  if (isOwner) tabs.push("settings");

  const getTabLabel = (tab) => {
    switch (tab) {
      case "posts":
        return `Publications ${stats?.posts ? `(${stats.posts})` : ""}`;
      case "videos":
        return `Vidéos ${userVideosCount > 0 ? `(${userVideosCount})` : ""}`;
      case "about":
        return "À propos";
      case "settings":
        return "Paramètres";
      default:
        return tab;
    }
  };

  return (
    <div className="profile-menu mt-6">
      {/* Menu des onglets */}
      <div className="flex space-x-4 mb-4 border-b border-gray-300 dark:border-gray-700 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 font-semibold whitespace-nowrap transition ${
              selectedTab === tab
                ? "border-b-2 border-orange-500 text-orange-500"
                : "text-gray-600 dark:text-gray-400 hover:text-orange-500"
            }`}
            onClick={() => onSelectTab(tab)}
          >
            {getTabLabel(tab)}
          </button>
        ))}
      </div>

      {/* Contenu selon l'onglet */}
      {selectedTab === "videos" && <ProfileVideosContent userId={userId} isOwner={isOwner} />}
    </div>
  );
}

/* =========================================
   🎬 Contenu Vidéos avec sync temps réel
========================================= */
const ProfileVideosContent = ({ userId, isOwner }) => {
  const { videos: allVideos, likeVideo, commentVideo, deleteVideo } = useVideos();
  const { getActiveUser } = useAuth();
  const activeUser = getActiveUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [sortBy, setSortBy] = useState("recent"); // recent, popular, views
  const [showStats, setShowStats] = useState(true);

  // Filtrer les vidéos de l'utilisateur
  const userVideos = useMemo(() => {
    if (!userId) return [];
    
    return allVideos.filter(video => {
      const videoOwnerId = video.uploadedBy?._id || video.uploadedBy;
      return videoOwnerId === userId;
    });
  }, [allVideos, userId]);

  // Trier les vidéos
  const sortedVideos = useMemo(() => {
    const videos = [...userVideos];

    switch (sortBy) {
      case "popular":
        return videos.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      case "views":
        return videos.sort((a, b) => (b.views || 0) - (a.views || 0));
      case "recent":
      default:
        return videos.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
    }
  }, [userVideos, sortBy]);

  // Calculer les statistiques totales
  const totalStats = useMemo(() => {
    return {
      totalVideos: sortedVideos.length,
      totalLikes: sortedVideos.reduce((sum, v) => sum + (v.likes || 0), 0),
      totalViews: sortedVideos.reduce((sum, v) => sum + (v.views || 0), 0),
      totalComments: sortedVideos.reduce((sum, v) => sum + (v.comments?.length || 0), 0),
    };
  }, [sortedVideos]);

  // Empty state - Aucune vidéo
  if (sortedVideos.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <div className="mb-6">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          >
            <p className="text-8xl mb-4">🎬</p>
          </motion.div>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            {isOwner ? "Aucune vidéo publiée" : "Pas encore de vidéos"}
          </p>
          {isOwner && (
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Créez votre première vidéo pour commencer !
            </p>
          )}
        </div>

        {isOwner && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/videos")}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-full font-bold text-lg hover:shadow-2xl transition-all flex items-center gap-2 mx-auto"
          >
            <HiSparkles className="text-xl" />
            Créer une vidéo
          </motion.button>
        )}
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats & Controls */}
      {showStats && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl shadow-lg border border-orange-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Stats */}
            <div className="flex items-center gap-8">
              <motion.div 
                whileHover={{ scale: 1.1 }}
                className="text-center"
              >
                <p className="text-3xl font-black bg-gradient-to-r from-orange-500 to-pink-600 bg-clip-text text-transparent">
                  {totalStats.totalVideos}
                </p>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1 justify-center">
                  <FaPlay className="text-orange-500" />
                  Vidéos
                </p>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.1 }}
                className="text-center"
              >
                <p className="text-3xl font-black text-red-600">
                  {formatNumber(totalStats.totalLikes)}
                </p>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1 justify-center">
                  <FaHeart className="text-red-500" />
                  Likes
                </p>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.1 }}
                className="text-center"
              >
                <p className="text-3xl font-black text-blue-600">
                  {formatNumber(totalStats.totalViews)}
                </p>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1 justify-center">
                  <FaEye className="text-blue-500" />
                  Vues
                </p>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.1 }}
                className="text-center"
              >
                <p className="text-3xl font-black text-purple-600">
                  {formatNumber(totalStats.totalComments)}
                </p>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1 justify-center">
                  <FaComment className="text-purple-500" />
                  Commentaires
                </p>
              </motion.div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Tri */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-semibold focus:border-orange-500 focus:outline-none transition-all"
              >
                <option value="recent">🕐 Plus récent</option>
                <option value="popular">❤️ Plus aimé</option>
                <option value="views">👁 Plus vu</option>
              </select>

              {/* Masquer stats */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowStats(false)}
                className="p-2 rounded-xl bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                ✕
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bouton pour réafficher les stats */}
      {!showStats && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowStats(true)}
          className="w-full py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          📊 Afficher les statistiques
        </motion.button>
      )}

      {/* Grille de vidéos */}
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {sortedVideos.map((video, index) => (
          <VideoGridItem
            key={video._id}
            video={video}
            index={index}
            onClick={() => setSelectedVideo(video)}
            isOwner={isOwner}
          />
        ))}
      </div>

      {/* Bouton créer une vidéo (si propriétaire) */}
      {isOwner && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/videos")}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <HiSparkles className="text-xl" />
          Créer une nouvelle vidéo
        </motion.button>
      )}

      {/* Modal de lecture */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoModal
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
            isOwner={isOwner}
            onDelete={async (videoId) => {
              try {
                await deleteVideo(videoId);
                setSelectedVideo(null);
              } catch (err) {
                console.error("Erreur suppression:", err);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* =========================================
   🎴 Item Grille de Vidéo
========================================= */
const VideoGridItem = ({ video, index, onClick, isOwner }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      onClick={onClick}
      className="relative aspect-[9/16] bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden cursor-pointer group shadow-lg"
    >
      {/* Thumbnail vidéo */}
      <video
        src={video.url}
        className="w-full h-full object-cover"
        preload="metadata"
        poster={video.thumbnail}
        muted
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Play icon au centre */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <motion.div
          whileHover={{ scale: 1.2 }}
          className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center"
        >
          <FaPlay className="text-white text-2xl ml-1" />
        </motion.div>
      </div>

      {/* Badge LIVE */}
      {video.isLive && (
        <div className="absolute top-2 left-2 z-10">
          <motion.span 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="bg-gradient-to-r from-red-600 to-pink-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg"
          >
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </motion.span>
        </div>
      )}

      {/* Stats en bas (visible au hover) */}
      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {/* Titre si présent */}
        {video.title && (
          <p className="text-white text-xs font-bold line-clamp-2 mb-2 drop-shadow-lg">
            {video.title}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
              <FaHeart className="text-red-400" />
              {formatNumber(video.likes || 0)}
            </span>
            <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
              <FaComment className="text-blue-400" />
              {formatNumber(video.comments?.length || 0)}
            </span>
            <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
              <FaEye className="text-green-400" />
              {formatNumber(video.views || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Durée en haut à droite */}
      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
        {formatDuration((video.endTime || 0) - (video.startTime || 0))}
      </div>

      {/* Badge propriétaire */}
      {isOwner && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="bg-orange-500/90 text-white text-xs font-bold px-2 py-1 rounded-full">
            ✏️
          </span>
        </div>
      )}
    </motion.div>
  );
};

/* =========================================
   🎥 Modal de lecture vidéo
========================================= */
const VideoModal = ({ video, onClose, isOwner, onDelete }) => {
  const videoRef = useRef(null);
  const isMountedRef = useRef(true);
  const { likeVideo, commentVideo } = useVideos();
  const { getActiveUser } = useAuth();
  const activeUser = getActiveUser();

  const [isPlaying, setIsPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localVideo, setLocalVideo] = useState(video);
  const [isLiked, setIsLiked] = useState(false);

  // 🔧 CORRECTION: Cleanup sécurisé au démontage
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Cleanup avec requestAnimationFrame pour éviter les conflits
      if (videoRef.current) {
        const vid = videoRef.current;
        requestAnimationFrame(() => {
          try {
            if (vid) {
              vid.pause();
              vid.src = '';
            }
          } catch (e) {
            console.warn("Erreur cleanup vidéo modal:", e);
          }
        });
      }
    };
  }, []);

  // Gestion ESC pour fermer
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Sync avec les updates
  useEffect(() => {
    setLocalVideo(video);
  }, [video]);

  // Auto-play avec vérification
  useEffect(() => {
    if (videoRef.current && isMountedRef.current) {
      const vid = videoRef.current;
      
      // Attendre que la vidéo soit prête
      const playVideo = async () => {
        try {
          if (vid.readyState >= 2) {
            await vid.play();
          } else {
            vid.addEventListener('loadeddata', async () => {
              if (isMountedRef.current) {
                await vid.play().catch(() => setIsPlaying(false));
              }
            }, { once: true });
          }
        } catch (err) {
          console.warn("Erreur autoplay:", err);
          setIsPlaying(false);
        }
      };
      
      playVideo();
    }
  }, []);

  const handleLike = async () => {
    const wasLiked = isLiked;
    setIsLiked(!isLiked);
    setLocalVideo(prev => ({
      ...prev,
      likes: wasLiked ? (prev.likes || 0) - 1 : (prev.likes || 0) + 1
    }));

    try {
      await likeVideo(video._id);
    } catch (err) {
      console.error("❌ Erreur like:", err);
      setIsLiked(wasLiked);
      setLocalVideo(prev => ({
        ...prev,
        likes: wasLiked ? (prev.likes || 0) + 1 : (prev.likes || 0) - 1
      }));
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(video._id);
    } catch (err) {
      console.error("❌ Erreur suppression:", err);
      alert("Erreur lors de la suppression");
    }
  };

  // 🔧 CORRECTION: Vérifications isMountedRef dans toutes les actions
  const handlePlayPause = () => {
    const vid = videoRef.current;
    if (!vid || !isMountedRef.current) return;

    if (isPlaying) {
      vid.pause();
    } else {
      vid.play().catch(e => console.warn('Play error:', e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: localVideo.title || "Vidéo",
          text: localVideo.description || "",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("🔗 Lien copié !");
      }
    } catch (err) {
      console.log("Partage annulé");
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-${video._id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      alert("📥 Téléchargement lancé !");
    } catch (err) {
      console.error("Erreur téléchargement:", err);
      alert("❌ Erreur lors du téléchargement");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Vidéo */}
        <video
          ref={videoRef}
          src={video.url}
          className="w-full h-full object-contain"
          style={{ filter: video.filter || "none" }}
          autoPlay
          muted={muted}
          loop
          playsInline
          onClick={handlePlayPause}
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

        {/* Bouton fermer */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute top-4 right-4 w-12 h-12 bg-black/60 backdrop-blur-md rounded-full text-white text-xl hover:bg-black/80 transition flex items-center justify-center z-10 shadow-lg"
        >
          <FaTimes />
        </motion.button>

        {/* Play/Pause overlay */}
        {!isPlaying && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="w-20 h-20 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center">
              <FaPlay className="text-white text-3xl ml-1" />
            </div>
          </motion.div>
        )}

        {/* Actions latérales */}
        <div className="absolute right-4 bottom-32 flex flex-col gap-4 z-20">
          {/* Like */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleLike}
            className="flex flex-col items-center gap-1"
          >
            <motion.div
              animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isLiked 
                  ? "bg-gradient-to-br from-red-500 to-pink-600" 
                  : "bg-black/60 backdrop-blur-md"
              }`}
            >
              <FaHeart className="text-white text-xl" />
            </motion.div>
            <span className="text-white text-xs font-bold drop-shadow-lg">
              {formatNumber(localVideo.likes || 0)}
            </span>
          </motion.button>

          {/* Comments */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center">
              <FaComment className="text-white text-xl" />
            </div>
            <span className="text-white text-xs font-bold drop-shadow-lg">
              {formatNumber(localVideo.comments?.length || 0)}
            </span>
          </div>

          {/* Views */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center">
              <FaEye className="text-white text-xl" />
            </div>
            <span className="text-white text-xs font-bold drop-shadow-lg">
              {formatNumber(localVideo.views || 0)}
            </span>
          </div>

          {/* Mute */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMuted(!muted)}
            className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white"
          >
            {muted ? <FaVolumeMute size={20} /> : <FaVolumeUp size={20} />}
          </motion.button>

          {/* Options */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowOptions(!showOptions)}
            className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white"
          >
            <HiDotsVertical size={20} />
          </motion.button>
        </div>

        {/* Infos bottom */}
        <div className="absolute bottom-0 left-0 right-20 p-4 z-10">
          {/* Titre */}
          {localVideo.title && (
            <h3 className="text-white font-bold text-lg mb-1 drop-shadow-lg">
              {localVideo.title}
            </h3>
          )}

          {/* Description */}
          {localVideo.description && (
            <p className="text-gray-300 text-sm mb-2 line-clamp-2 drop-shadow-lg">
              {localVideo.description}
            </p>
          )}

          {/* Date */}
          <p className="text-gray-400 text-xs drop-shadow-lg">
            {new Date(localVideo.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Menu options */}
        <AnimatePresence>
          {showOptions && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30"
                onClick={() => setShowOptions(false)}
              />

              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30 }}
                className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl p-4 z-40"
              >
                <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />

                <div className="space-y-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShare}
                    className="w-full flex items-center gap-3 p-4 bg-gray-800 rounded-xl text-white hover:bg-gray-700 transition"
                  >
                    <FaShare className="text-blue-400" />
                    <span className="font-semibold">Partager</span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDownload}
                    className="w-full flex items-center gap-3 p-4 bg-gray-800 rounded-xl text-white hover:bg-gray-700 transition"
                  >
                    <FaDownload className="text-green-400" />
                    <span className="font-semibold">Télécharger</span>
                  </motion.button>

                  {isOwner && (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setShowOptions(false);
                        setShowDeleteConfirm(true);
                      }}
                      className="w-full flex items-center gap-3 p-4 bg-red-500/20 rounded-xl text-red-400 hover:bg-red-500/30 transition"
                    >
                      <FaTrash />
                      <span className="font-semibold">Supprimer</span>
                    </motion.button>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowOptions(false)}
                    className="w-full p-4 bg-gray-700 rounded-xl text-white font-semibold hover:bg-gray-600 transition"
                  >
                    Annuler
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Confirmation suppression */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-red-500/30"
              >
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FaTrash className="text-red-500 text-2xl" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Supprimer la vidéo ?
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Cette action est irréversible. La vidéo sera définitivement supprimée.
                  </p>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition"
                  >
                    Annuler
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDelete}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-semibold hover:from-red-700 hover:to-pink-700 transition shadow-lg"
                  >
                    Supprimer
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

/* =========================================
   ⏱️ Helpers & Utils
========================================= */

// Formater les nombres (1000 -> 1K, 1000000 -> 1M)
const formatNumber = (num) => {
  if (!num || num === 0) return "0";
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
};

// Formater la durée en secondes vers MM:SS
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Formater la date relative (il y a X temps)
const formatTimeAgo = (date) => {
  if (!date) return "Récemment";
  
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  if (diffWeeks < 4) return `Il y a ${diffWeeks} sem`;
  if (diffMonths < 12) return `Il y a ${diffMonths} mois`;
  
  const diffYears = Math.floor(diffDays / 365);
  return `Il y a ${diffYears} an${diffYears > 1 ? 's' : ''}`;
};