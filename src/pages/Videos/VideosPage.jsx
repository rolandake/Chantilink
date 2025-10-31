// src/pages/videos/VideosPage.jsx - VERSION COMPLÈTE
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useVideos } from "../../context/VideoContext";
import VideoCard from "./VideoCard";
import VideoModal from "./VideoModal";
import { 
  FaPlus, 
  FaSearch, 
  FaTh, 
  FaPlay,
  FaFire,
  FaUserFriends,
  FaCompass,
  FaHeart,
  FaComment
} from "react-icons/fa";
import { HiSparkles } from "react-icons/hi";
import axios from "axios";

const VideosPage = () => {
  // ✅ Récupération depuis AuthContext
  const { getActiveUser, getToken } = useAuth();
  const currentUser = getActiveUser();
  const { videos, loading, hasMore, fetchVideos, incrementViews } = useVideos();

  const [activeIndex, setActiveIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState("swipe"); // swipe ou feed
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [activeTab, setActiveTab] = useState("foryou"); // foryou, following, discover

  const containerRef = useRef(null);
  const viewTracked = useRef(new Set());

  // Log debug pour vérifier l'utilisateur
  useEffect(() => {
    if (currentUser) {
      console.log("👤 [VideosPage] Utilisateur actif:", {
        id: currentUser.user?._id,
        email: currentUser.user?.email,
        username: currentUser.user?.username,
        token: currentUser.token ? "✅" : "❌"
      });
    }
  }, [currentUser]);

  // Charger les vidéos au montage
  useEffect(() => {
    if (videos.length === 0) {
      fetchVideos(true);
    }
  }, []);

  // Filtrer les vidéos selon la recherche
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = videos.filter(
        (v) =>
          v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.uploadedBy?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.uploadedBy?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredVideos(filtered);
    } else {
      setFilteredVideos(videos);
    }
  }, [searchQuery, videos]);

  // Tracker les vues
  useEffect(() => {
    const activeVideo = filteredVideos[activeIndex];
    if (activeVideo && !viewTracked.current.has(activeVideo._id)) {
      viewTracked.current.add(activeVideo._id);
      incrementViews(activeVideo._id);
    }
  }, [activeIndex, filteredVideos, incrementViews]);

  // Gestion du scroll pour navigation
  const handleScroll = useCallback(
    (e) => {
      if (viewMode !== "swipe") return;

      const container = containerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const windowHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / windowHeight);

      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < filteredVideos.length) {
        setActiveIndex(newIndex);
      }

      // Charger plus de vidéos si proche de la fin
      if (
        hasMore &&
        !loading &&
        scrollTop + windowHeight >= container.scrollHeight - windowHeight
      ) {
        fetchVideos();
      }
    },
    [activeIndex, filteredVideos.length, hasMore, loading, fetchVideos, viewMode]
  );

  // Mode Swipe (TikTok)
  if (viewMode === "swipe") {
    return (
      <div className="videos-page relative h-screen bg-black overflow-hidden">
        {/* Header modernisé */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 via-black/60 to-transparent backdrop-blur-sm">
          <div className="flex items-center justify-between max-w-7xl mx-auto px-4 py-4">
            {/* Logo/Titre */}
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-white text-2xl font-black tracking-tight flex items-center gap-2"
            >
              <span className="bg-gradient-to-r from-orange-500 to-pink-600 bg-clip-text text-transparent">
                Vidéos
              </span>
              <HiSparkles className="text-yellow-400 text-xl" />
            </motion.h1>

            {/* Actions droite */}
            <div className="flex items-center gap-2">
              {/* Recherche */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode("feed")}
                className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all shadow-lg"
              >
                <FaSearch size={18} />
              </motion.button>

              {/* Mode grille */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode("feed")}
                className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all shadow-lg"
              >
                <FaTh size={18} />
              </motion.button>

              {/* Bouton upload */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(true)}
                className="p-3 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 text-white hover:from-orange-600 hover:to-pink-700 transition-all shadow-xl"
              >
                <FaPlus size={18} />
              </motion.button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex justify-center gap-8 px-4 pb-3">
            {[
              { id: "foryou", label: "Pour toi", icon: FaFire },
              { id: "following", label: "Abonnés", icon: FaUserFriends },
              { id: "discover", label: "Découvrir", icon: FaCompass },
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-black shadow-lg"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <tab.icon />
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Container de vidéos scrollable */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
          style={{ scrollSnapType: "y mandatory", scrollBehavior: "smooth" }}
        >
          {filteredVideos.length === 0 && !loading ? (
            <div className="h-screen flex items-center justify-center px-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="text-6xl mb-4">🎬</div>
                <p className="text-white text-2xl font-bold mb-2">Aucune vidéo</p>
                <p className="text-gray-400 mb-6">Soyez le premier à partager !</p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowModal(true)}
                  className="px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-full font-bold text-lg hover:shadow-2xl transition-all"
                >
                  Créer une vidéo
                </motion.button>
              </motion.div>
            </div>
          ) : (
            filteredVideos.map((video, index) => (
              <div
                key={video._id}
                className="h-screen snap-start snap-always relative"
              >
                <VideoCard
                  video={video}
                  isActive={index === activeIndex}
                />
              </div>
            ))
          )}

          {/* Loader */}
          {loading && (
            <div className="h-screen flex items-center justify-center bg-black">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full"
              />
            </div>
          )}
        </div>

        {/* Indicateur de position modernisé */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
          {filteredVideos.slice(0, 10).map((_, index) => (
            <motion.div
              key={index}
              animate={{
                height: index === activeIndex % 10 ? "2.5rem" : "0.5rem",
                opacity: index === activeIndex % 10 ? 1 : 0.4,
              }}
              className={`w-1 rounded-full transition-all ${
                index === activeIndex % 10
                  ? "bg-gradient-to-b from-orange-500 to-pink-600"
                  : "bg-white/50"
              }`}
            />
          ))}
        </div>

        {/* Modal upload */}
        <VideoModal showModal={showModal} setShowModal={setShowModal} />
      </div>
    );
  }

  // Mode Feed (grille)
  return (
    <div className="videos-page bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black min-h-screen">
      {/* Header avec recherche */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h1 className="text-3xl font-black bg-gradient-to-r from-orange-500 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
              Vidéos
              <HiSparkles className="text-yellow-400" />
            </h1>

            <div className="flex-1 max-w-md">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher des vidéos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-orange-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode("swipe")}
                className="p-3 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 text-white hover:shadow-lg transition-all"
              >
                <FaPlay />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(true)}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold hover:shadow-lg transition-all flex items-center gap-2"
              >
                <FaPlus />
                <span className="hidden md:inline">Créer</span>
              </motion.button>
            </div>
          </div>

          {/* Tabs modernisés */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: "foryou", label: "Pour toi", icon: FaFire, color: "orange" },
              { id: "following", label: "Abonnés", icon: FaUserFriends, color: "blue" },
              { id: "discover", label: "Découvrir", icon: FaCompass, color: "purple" },
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${
                        tab.color === "orange"
                          ? "from-orange-500 to-pink-600"
                          : tab.color === "blue"
                          ? "from-blue-500 to-cyan-600"
                          : "from-purple-500 to-pink-600"
                      } text-white shadow-lg`
                    : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                <tab.icon />
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu selon l'onglet */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "foryou" && (
          <ForYouFeedContent 
            currentUser={currentUser} 
            searchQuery={searchQuery}
          />
        )}
        {activeTab === "following" && (
          <FollowingFeedContent 
            currentUser={currentUser} 
          />
        )}
        {activeTab === "discover" && (
          <DiscoverFeedContent 
            currentUser={currentUser} 
            searchQuery={searchQuery}
          />
        )}
      </div>

      {/* Modal upload */}
      <VideoModal showModal={showModal} setShowModal={setShowModal} />
    </div>
  );
};

// ========================================
// FEED FOR YOU - Vidéos recommandées
// ========================================
const ForYouFeedContent = ({ currentUser, searchQuery }) => {
  const { videos, loading } = useVideos();
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Algorithme de recommandation basique
  const sortedVideos = React.useMemo(() => {
    let filtered = videos;
    
    // Appliquer recherche
    if (searchQuery.trim()) {
      filtered = videos.filter(
        (v) =>
          v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.uploadedBy?.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Score de recommandation
    return filtered
      .map((v) => ({
        ...v,
        score: (v.likes || 0) * 3 + (v.views || 0) * 1 + (v.comments?.length || 0) * 5,
      }))
      .sort((a, b) => b.score - a.score);
  }, [videos, searchQuery]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <FaFire className="text-orange-500" />
          <span className="font-semibold">{sortedVideos.length} vidéos tendances</span>
        </div>
      </div>

      {sortedVideos.length > 0 ? (
        <VideoGrid 
          videos={sortedVideos} 
          currentUser={currentUser} 
          selectedVideo={selectedVideo}
          setSelectedVideo={setSelectedVideo}
        />
      ) : (
        <EmptyState 
          icon="🔥"
          title="Aucune vidéo tendance"
          description="Revenez plus tard pour découvrir du contenu populaire"
        />
      )}
    </div>
  );
};

// ========================================
// FEED FOLLOWING - Vidéos des abonnements
// ========================================
const FollowingFeedContent = ({ currentUser }) => {
  const { getToken } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    const loadFollowingVideos = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          console.warn("⚠️ Pas de token disponible");
          setLoading(false);
          return;
        }

        const apiClient = axios.create({
          baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
          headers: { Authorization: `Bearer ${token}` },
        });

        // Récupérer les abonnements
        const userRes = await apiClient.get(`/api/users/${currentUser?.user?._id}`);
        const following = userRes.data.following || [];

        // Récupérer toutes les vidéos
        const videosRes = await apiClient.get(`/api/videos?page=1&limit=100`);
        const allVideos = videosRes.data.videos || videosRes.data || [];

        // Filtrer par abonnements
        const followingIds = following.map((u) => u._id || u);
        const filteredVideos = allVideos.filter((v) =>
          followingIds.includes(v.uploadedBy?._id || v.uploadedBy)
        );

        // Trier par date
        filteredVideos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setVideos(filteredVideos);
      } catch (err) {
        console.error("❌ Erreur chargement following:", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?.user?._id) {
      loadFollowingVideos();
    }
  }, [currentUser, getToken]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <FaUserFriends className="text-blue-500" />
        <span className="font-semibold">{videos.length} vidéos de vos abonnements</span>
      </div>

      {videos.length > 0 ? (
        <VideoGrid 
          videos={videos} 
          currentUser={currentUser} 
          selectedVideo={selectedVideo}
          setSelectedVideo={setSelectedVideo}
        />
      ) : (
        <EmptyState 
          icon="👥"
          title="Aucune vidéo d'abonnements"
          description="Suivez des créateurs pour voir leur contenu ici"
        />
      )}
    </div>
  );
};

// ========================================
// FEED DISCOVER - Découvrir du contenu
// ========================================
const DiscoverFeedContent = ({ currentUser, searchQuery }) => {
  const { videos } = useVideos();
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Vidéos random (non vues par l'utilisateur)
  const discoverVideos = React.useMemo(() => {
    let filtered = videos.filter(
      (v) => (v.uploadedBy?._id || v.uploadedBy) !== currentUser?.user?._id
    );

    // Appliquer recherche
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (v) =>
          v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.uploadedBy?.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Mélanger aléatoirement
    return filtered.sort(() => Math.random() - 0.5);
  }, [videos, currentUser, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <FaCompass className="text-purple-500" />
        <span className="font-semibold">{discoverVideos.length} vidéos à découvrir</span>
      </div>

      {discoverVideos.length > 0 ? (
        <VideoGrid 
          videos={discoverVideos} 
          currentUser={currentUser} 
          selectedVideo={selectedVideo}
          setSelectedVideo={setSelectedVideo}
        />
      ) : (
        <EmptyState 
          icon="🧭"
          title="Rien à découvrir pour le moment"
          description="Revenez plus tard pour explorer du nouveau contenu"
        />
      )}
    </div>
  );
};

// ========================================
// GRILLE DE VIDÉOS ULTRA MODERNE
// ========================================
const VideoGrid = ({ videos, currentUser, selectedVideo, setSelectedVideo }) => {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {videos.map((video) => {
          const owner = video?.uploadedBy || video?.owner || {};
          const ownerAvatar = owner?.profilePicture || owner?.profilePhoto || owner?.avatar || "/default-avatar.png";
          const ownerUsername = owner?.username || owner?.fullName || "Utilisateur";

          return (
            <motion.div
              key={video._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.03, y: -5 }}
              className="relative aspect-[9/16] bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-2xl transition-all"
              onClick={() => setSelectedVideo(video)}
            >
              {/* Thumbnail vidéo */}
              <video
                src={video.url}
                className="w-full h-full object-cover"
                preload="metadata"
              />

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Infos hover */}
              <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {/* Stats */}
                <div className="flex items-center gap-4 text-white text-sm mb-3">
                  <span className="flex items-center gap-1">
                    <FaHeart className="text-red-500" />
                    {formatNumber(video.likes || 0)}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaComment className="text-blue-400" />
                    {formatNumber(video.comments?.length || 0)}
                  </span>
                  <span className="flex items-center gap-1">
                    👁 {formatNumber(video.views || 0)}
                  </span>
                </div>

                {/* Titre */}
                {video.title && (
                  <p className="text-white font-bold text-sm line-clamp-2 mb-2">
                    {video.title}
                  </p>
                )}

                {/* User info */}
                <div className="flex items-center gap-2">
                  <img
                    src={ownerAvatar}
                    alt={ownerUsername}
                    className="w-6 h-6 rounded-full object-cover border-2 border-white"
                  />
                  <span className="text-white text-xs font-semibold truncate">
                    @{ownerUsername}
                  </span>
                </div>
              </div>

              {/* Badge durée */}
              <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
                {formatDuration(video.endTime - (video.startTime || 0))}
              </div>

              {/* Badge LIVE */}
              {video.isLive && (
                <div className="absolute top-2 left-2 bg-gradient-to-r from-red-600 to-pink-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
                  <span className="w-2 h-2 bg-white rounded-full" />
                  LIVE
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Modal détail vidéo */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoModalDetail
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// ========================================
// MODAL DÉTAIL VIDÉO
// ========================================
const VideoModalDetail = ({ video, onClose }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

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
        className="relative w-full max-w-md aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          ref={videoRef}
          src={video.url}
          className="w-full h-full object-contain"
          autoPlay
          controls
          loop
          style={{ filter: video.filter || "none" }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Bouton fermer */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute top-4 right-4 w-12 h-12 bg-black/60 backdrop-blur-md rounded-full text-white text-xl hover:bg-black/80 transition-all shadow-lg flex items-center justify-center z-10"
        >
          ✕
        </motion.button>

        {/* Overlay texte si présent */}
        {video.textOverlay && (
          <div
            className="absolute text-2xl font-bold pointer-events-none z-5"
            style={{
              color: video.textColor || "#ffffff",
              left: `${video.textPos?.x || 50}%`,
              top: `${video.textPos?.y || 10}%`,
              transform: "translate(-50%, -50%)",
              textShadow: "0 0 20px rgba(0,0,0,0.8)",
            }}
          >
            {video.textOverlay}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ========================================
// ÉTAT VIDE
// ========================================
const EmptyState = ({ icon, title, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-20"
  >
    <div className="text-6xl mb-4">{icon}</div>
    <p className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
      {title}
    </p>
    <p className="text-gray-500 dark:text-gray-400">{description}</p>
  </motion.div>
);

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

// Formater les nombres (1000 -> 1K, 1000000 -> 1M)
const formatNumber = (num) => {
  if (!num || num === 0) return "0";
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
};

// Formater la durée en secondes vers MM:SS
const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return "0:00";
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
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  if (diffWeeks < 4) return `Il y a ${diffWeeks} sem`;
  if (diffMonths < 12) return `Il y a ${diffMonths} mois`;
  return `Il y a ${diffYears} an${diffYears > 1 ? 's' : ''}`;
};

// Générer une couleur aléatoire pour les avatars
const getRandomColor = () => {
  const colors = [
    "bg-gradient-to-br from-pink-500 to-rose-500",
    "bg-gradient-to-br from-purple-500 to-indigo-500",
    "bg-gradient-to-br from-blue-500 to-cyan-500",
    "bg-gradient-to-br from-green-500 to-emerald-500",
    "bg-gradient-to-br from-yellow-500 to-orange-500",
    "bg-gradient-to-br from-red-500 to-pink-500",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Tronquer le texte
const truncateText = (text, maxLength = 100) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// Vérifier si une vidéo est aimée par l'utilisateur
const isVideoLiked = (video, userId) => {
  if (!video || !userId) return false;
  return video.likedBy?.includes(userId) || false;
};

// Calculer le ratio engagement
const getEngagementRate = (video) => {
  if (!video || !video.views || video.views === 0) return 0;
  const engagement = (video.likes || 0) + (video.comments?.length || 0) * 2;
  return ((engagement / video.views) * 100).toFixed(1);
};

// Vérifier si l'utilisateur suit le créateur
const isFollowing = (creatorId, currentUser) => {
  if (!currentUser?.user?.following) return false;
  return currentUser.user.following.some(
    (f) => (f._id || f) === creatorId
  );
};

// Obtenir l'initiale du nom pour l'avatar par défaut
const getInitials = (name) => {
  if (!name) return "?";
  const names = name.trim().split(" ");
  if (names.length === 1) return names[0][0].toUpperCase();
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

// Valider une URL de vidéo
const isValidVideoUrl = (url) => {
  if (!url) return false;
  const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".avi"];
  return videoExtensions.some((ext) => url.toLowerCase().includes(ext));
};

// Générer un ID unique
const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Détecter si on est sur mobile
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// Copier dans le presse-papier
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Erreur copie:", err);
    return false;
  }
};

// Partager une vidéo (Web Share API)
const shareVideo = async (video) => {
  if (!navigator.share) {
    // Fallback: copier le lien
    const url = `${window.location.origin}/videos/${video._id}`;
    return await copyToClipboard(url);
  }

  try {
    await navigator.share({
      title: video.title || "Vidéo",
      text: video.description || "Découvrez cette vidéo !",
      url: `${window.location.origin}/videos/${video._id}`,
    });
    return true;
  } catch (err) {
    console.error("Erreur partage:", err);
    return false;
  }
};

// Télécharger une vidéo
const downloadVideo = async (videoUrl, filename = "video.mp4") => {
  try {
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error("Erreur téléchargement:", err);
    return false;
  }
};

// Formater les vues avec animation
const AnimatedCounter = ({ value, duration = 1000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    if (start === end) return;

    const incrementTime = (duration / end) * 1000;
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{formatNumber(count)}</span>;
};

// Composant Badge personnalisé
const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
    primary: "bg-gradient-to-r from-orange-500 to-pink-600 text-white",
    success: "bg-green-500 text-white",
    warning: "bg-yellow-500 text-white",
    danger: "bg-red-500 text-white",
    live: "bg-gradient-to-r from-red-600 to-pink-600 text-white animate-pulse",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

// Composant Skeleton pour le chargement
const VideoSkeleton = () => (
  <div className="aspect-[9/16] bg-gray-200 dark:bg-gray-800 rounded-2xl overflow-hidden animate-pulse">
    <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800" />
  </div>
);

// Composant Tooltip
const Tooltip = ({ children, text, position = "top" }) => {
  const [show, setShow] = useState(false);

  const positions = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={`absolute ${positions[position]} z-50 px-3 py-2 text-xs font-semibold text-white bg-black/90 backdrop-blur-sm rounded-lg whitespace-nowrap pointer-events-none`}
        >
          {text}
          <div
            className={`absolute w-2 h-2 bg-black/90 rotate-45 ${
              position === "top"
                ? "bottom-[-4px] left-1/2 -translate-x-1/2"
                : position === "bottom"
                ? "top-[-4px] left-1/2 -translate-x-1/2"
                : position === "left"
                ? "right-[-4px] top-1/2 -translate-y-1/2"
                : "left-[-4px] top-1/2 -translate-y-1/2"
            }`}
          />
        </div>
      )}
    </div>
  );
};

// Composant de notification Toast
const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  const colors = {
    success: "from-green-500 to-emerald-500",
    error: "from-red-500 to-pink-500",
    warning: "from-yellow-500 to-orange-500",
    info: "from-blue-500 to-cyan-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-6 py-4 bg-gradient-to-r ${colors[type]} text-white rounded-2xl shadow-2xl backdrop-blur-md`}
    >
      <span className="text-2xl">{icons[type]}</span>
      <p className="font-semibold">{message}</p>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="ml-2 text-white/80 hover:text-white transition-colors"
      >
        ✕
      </motion.button>
    </motion.div>
  );
};

// Export du composant principal et des utilitaires
export default VideosPage;

export {
  formatNumber,
  formatDuration,
  formatTimeAgo,
  getRandomColor,
  truncateText,
  isVideoLiked,
  getEngagementRate,
  isFollowing,
  getInitials,
  isValidVideoUrl,
  generateUniqueId,
  isMobile,
  copyToClipboard,
  shareVideo,
  downloadVideo,
  AnimatedCounter,
  Badge,
  VideoSkeleton,
  Tooltip,
  Toast,
};