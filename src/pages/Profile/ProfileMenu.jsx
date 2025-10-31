// ============================================
// 👤 ProfileMenu.jsx - Avec section Vidéos synchronisée
// ============================================

// src/components/profile/ProfileMenu.jsx
import React, { useEffect, useState, useRef } from "react";
import { useVideos } from "../../context/VideoContext";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function ProfileMenu({ selectedTab, onSelectTab, isOwner, userId, stats }) {
  const tabs = ["posts", "videos", "about"];
  if (isOwner) tabs.push("settings");

  const getTabLabel = (tab) => {
    switch (tab) {
      case "posts":
        return `Publications ${stats?.posts ? `(${stats.posts})` : ""}`;
      case "videos":
        return "Vidéos"; // Affichera le compte en temps réel
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
      <div className="flex space-x-4 mb-4 border-b border-gray-300 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 font-semibold whitespace-nowrap transition ${
              selectedTab === tab
                ? "border-b-2 border-orange-500 text-orange-500"
                : "text-gray-600 hover:text-orange-500"
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
  const { fetchUserVideos, videos: allVideos, socket } = useVideos();
  const { getActiveUser } = useAuth();
  const activeUser = getActiveUser();
  const navigate = useNavigate();

  const [userVideos, setUserVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [sortBy, setSortBy] = useState("recent"); // recent, popular, views
  const [viewMode, setViewMode] = useState("grid"); // grid, list

  const targetUserId = userId || activeUser?.id;

  // ============================================
  // 📡 Charger les vidéos utilisateur
  // ============================================
  useEffect(() => {
    const loadVideos = async () => {
      setLoading(true);
      try {
        const videos = await fetchUserVideos(targetUserId);
        setUserVideos(videos);
      } catch (err) {
        console.error("❌ [ProfileVideos] Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    };

    if (targetUserId) {
      loadVideos();
    }
  }, [targetUserId, fetchUserVideos]);

  // ============================================
  // 🔌 SYNC TEMPS RÉEL via Socket.io
  // ============================================
  useEffect(() => {
    if (!socket || !targetUserId) return;

    // Nouvelle vidéo publiée par cet utilisateur
    const handleNewVideo = (video) => {
      if (video.uploadedBy?._id === targetUserId || video.uploadedBy === targetUserId) {
        console.log("🎬 [ProfileVideos] Nouvelle vidéo ajoutée:", video._id);
        setUserVideos((prev) => {
          if (prev.find((v) => v._id === video._id)) return prev;
          return [video, ...prev];
        });
      }
    };

    // Like en temps réel
    const handleVideoLiked = ({ videoId, likes, userId: likerId }) => {
      console.log("❤️ [ProfileVideos] Like reçu:", videoId);
      setUserVideos((prev) =>
        prev.map((v) => {
          if (v._id === videoId) {
            return {
              ...v,
              likes: likes ?? (v.likes || 0) + 1,
              userLiked: likerId === activeUser?.id ? true : v.userLiked,
            };
          }
          return v;
        })
      );
    };

    // Commentaire en temps réel
    const handleCommentAdded = ({ videoId, comment }) => {
      console.log("💬 [ProfileVideos] Commentaire reçu:", videoId);
      setUserVideos((prev) =>
        prev.map((v) => {
          if (v._id === videoId) {
            return {
              ...v,
              comments: [...(v.comments || []), comment],
            };
          }
          return v;
        })
      );
    };

    // Vues en temps réel
    const handleVideoViewed = ({ videoId, views }) => {
      console.log("👁 [ProfileVideos] Vue ajoutée:", videoId);
      setUserVideos((prev) =>
        prev.map((v) => (v._id === videoId ? { ...v, views } : v))
      );
    };

    // Vidéo supprimée
    const handleVideoDeleted = (videoId) => {
      console.log("🗑️ [ProfileVideos] Vidéo supprimée:", videoId);
      setUserVideos((prev) => prev.filter((v) => v._id !== videoId));
    };

    socket.on("newVideo", handleNewVideo);
    socket.on("videoLiked", handleVideoLiked);
    socket.on("commentAdded", handleCommentAdded);
    socket.on("videoViewed", handleVideoViewed);
    socket.on("videoDeleted", handleVideoDeleted);

    return () => {
      socket.off("newVideo", handleNewVideo);
      socket.off("videoLiked", handleVideoLiked);
      socket.off("commentAdded", handleCommentAdded);
      socket.off("videoViewed", handleVideoViewed);
      socket.off("videoDeleted", handleVideoDeleted);
    };
  }, [socket, targetUserId, activeUser]);

  // ============================================
  // 🎯 Tri des vidéos
  // ============================================
  const sortedVideos = React.useMemo(() => {
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

  // ============================================
  // 🎨 UI LOADING
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Chargement des vidéos...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // 🎨 UI EMPTY STATE
  // ============================================
  if (sortedVideos.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="mb-6">
          <p className="text-6xl mb-4">🎬</p>
          <p className="text-xl font-semibold text-gray-700">
            {isOwner ? "Aucune vidéo publiée" : "Pas encore de vidéos"}
          </p>
          {isOwner && (
            <p className="text-gray-500 mt-2">
              Créez votre première vidéo pour commencer !
            </p>
          )}
        </div>

        {isOwner && (
          <button
            onClick={() => navigate("/videos")}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full font-semibold hover:from-orange-600 hover:to-red-600 transition shadow-lg"
          >
            📹 Créer une vidéo
          </button>
        )}
      </div>
    );
  }

  // ============================================
  // 🎨 UI HEADER avec stats et filtres
  // ============================================
  return (
    <div className="space-y-4">
      {/* Stats & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-4 rounded-xl shadow-sm">
        {/* Stats */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {sortedVideos.length}
            </p>
            <p className="text-xs text-gray-600">Vidéos</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {sortedVideos.reduce((sum, v) => sum + (v.likes || 0), 0)}
            </p>
            <p className="text-xs text-gray-600">Likes</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {sortedVideos.reduce((sum, v) => sum + (v.views || 0), 0)}
            </p>
            <p className="text-xs text-gray-600">Vues</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {sortedVideos.reduce(
                (sum, v) => sum + (v.comments?.length || 0),
                0
              )}
            </p>
            <p className="text-xs text-gray-600">Commentaires</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Tri */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-orange-500 focus:outline-none"
          >
            <option value="recent">➕ Plus récent</option>
            <option value="popular">❤️ Plus aimé</option>
            <option value="views">👁 Plus vu</option>
          </select>

          {/* Mode affichage */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 text-sm transition ${
                viewMode === "grid"
                  ? "bg-orange-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              📱 Grille
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 text-sm transition ${
                viewMode === "list"
                  ? "bg-orange-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              📋 Liste
            </button>
          </div>
        </div>
      </div>

      {/* Vue Grille */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-3 gap-1">
          {sortedVideos.map((video) => (
            <VideoGridItem
              key={video._id}
              video={video}
              onClick={() => setSelectedVideo(video)}
            />
          ))}
        </div>
      )}

      {/* Vue Liste */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {sortedVideos.map((video) => (
            <VideoListItem
              key={video._id}
              video={video}
              onClick={() => setSelectedVideo(video)}
            />
          ))}
        </div>
      )}

      {/* Modal de lecture */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoModal
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
            isOwner={isOwner}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* =========================================
   🎴 Item Grille
========================================= */
const VideoGridItem = ({ video, onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      className="relative aspect-[9/16] bg-gray-800 rounded-lg overflow-hidden cursor-pointer group"
    >
      {/* Vidéo preview */}
      <video
        src={video.url}
        className="w-full h-full object-cover"
        preload="metadata"
        poster={video.thumbnail}
      />

      {/* Overlay hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
        {/* Stats */}
        <div className="flex items-center gap-3 text-white text-sm mb-2">
          <span className="flex items-center gap-1">
            <span className="text-red-400">❤️</span>
            {video.likes || 0}
          </span>
          <span className="flex items-center gap-1">
            <span className="text-blue-400">💬</span>
            {video.comments?.length || 0}
          </span>
          <span className="flex items-center gap-1">
            <span className="text-green-400">👁</span>
            {video.views || 0}
          </span>
        </div>

        {/* Titre */}
        {video.title && (
          <p className="text-white text-xs font-semibold line-clamp-2">
            {video.title}
          </p>
        )}
      </div>

      {/* Badge LIVE */}
      {video.isLive && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
            🔴 LIVE
          </span>
        </div>
      )}

      {/* Durée */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
        {formatDuration((video.endTime || 0) - (video.startTime || 0))}
      </div>
    </motion.div>
  );
};

/* =========================================
   📋 Item Liste
========================================= */
const VideoListItem = ({ video, onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="flex gap-3 bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative w-32 aspect-[9/16] bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
        <video
          src={video.url}
          className="w-full h-full object-cover"
          preload="metadata"
          poster={video.thumbnail}
        />

        {video.isLive && (
          <div className="absolute top-1 left-1">
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              🔴 LIVE
            </span>
          </div>
        )}

        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
          {formatDuration((video.endTime || 0) - (video.startTime || 0))}
        </div>
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 line-clamp-1 mb-1">
          {video.title || "Sans titre"}
        </h3>

        {video.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {video.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <span className="text-red-500">❤️</span>
            {video.likes || 0}
          </span>
          <span className="flex items-center gap-1">
            <span className="text-blue-500">💬</span>
            {video.comments?.length || 0}
          </span>
          <span className="flex items-center gap-1">
            <span className="text-green-500">👁</span>
            {video.views || 0}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(video.createdAt).toLocaleDateString("fr-FR")}
          </span>
        </div>

        {/* Hashtags */}
        {video.hashtags && video.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {video.hashtags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* =========================================
   🎥 Modal de lecture vidéo
========================================= */
const VideoModal = ({ video, onClose, isOwner }) => {
  const videoRef = useRef(null);
  const { deleteVideo, likeVideo, commentVideo } = useVideos();
  const { getActiveUser } = useAuth();
  const activeUser = getActiveUser();

  const [isPlaying, setIsPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localVideo, setLocalVideo] = useState(video);

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

  const handleLike = async () => {
    try {
      const res = await likeVideo(video._id);
      setLocalVideo((prev) => ({
        ...prev,
        likes: res.likes,
        userLiked: !prev.userLiked,
      }));
    } catch (err) {
      console.error("❌ Erreur like:", err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteVideo(video._id);
      onClose();
    } catch (err) {
      console.error("❌ Erreur suppression:", err);
      alert("Erreur lors de la suppression");
    }
  };

  const handlePlayPause = () => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isPlaying) {
      vid.pause();
    } else {
      vid.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md aspect-[9/16] bg-black rounded-lg overflow-hidden"
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
          onClick={handlePlayPause}
        />

        {/* Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          {/* Fermer */}
          <button
            onClick={onClose}
            className="w-10 h-10 bg-black/60 backdrop-blur-sm rounded-full text-white text-xl hover:bg-black/80 transition"
          >
            ✕
          </button>

          {/* Mute */}
          <button
            onClick={() => setMuted(!muted)}
            className="w-10 h-10 bg-black/60 backdrop-blur-sm rounded-full text-white text-lg hover:bg-black/80 transition"
          >
            {muted ? "🔇" : "🔊"}
          </button>

          {/* Supprimer (si propriétaire) */}
          {isOwner && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-10 h-10 bg-red-600/80 backdrop-blur-sm rounded-full text-white text-lg hover:bg-red-700 transition"
            >
              🗑️
            </button>
          )}
        </div>

        {/* Infos bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-4">
          {/* Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Like */}
              <button
                onClick={handleLike}
                className="flex flex-col items-center gap-1 transition hover:scale-110"
              >
                <span className="text-2xl">
                  {localVideo.userLiked ? "❤️" : "🤍"}
                </span>
                <span className="text-white text-xs font-semibold">
                  {localVideo.likes || 0}
                </span>
              </button>

              {/* Comments */}
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex flex-col items-center gap-1 transition hover:scale-110"
              >
                <span className="text-2xl">💬</span>
                <span className="text-white text-xs font-semibold">
                  {localVideo.comments?.length || 0}
                </span>
              </button>

              {/* Views */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">👁</span>
                <span className="text-white text-xs font-semibold">
                  {localVideo.views || 0}
                </span>
              </div>
            </div>

            {/* Share */}
            <button
              onClick={async () => {
                try {
                  await navigator.share({
                    title: localVideo.title,
                    url: window.location.href,
                  });
                } catch (err) {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Lien copié !");
                }
              }}
              className="text-2xl transition hover:scale-110"
            >
              📤
            </button>
          </div>

          {/* Titre & Description */}
          {localVideo.title && (
            <h3 className="text-white font-bold text-lg mb-1">
              {localVideo.title}
            </h3>
          )}

          {localVideo.description && (
            <p className="text-gray-300 text-sm mb-2 line-clamp-2">
              {localVideo.description}
            </p>
          )}

          {/* Date */}
          <p className="text-gray-400 text-xs">
            {new Date(localVideo.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Confirmation suppression */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Supprimer la vidéo ?
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Cette action est irréversible.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* =========================================
   ⏱️ Helpers
========================================= */
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};