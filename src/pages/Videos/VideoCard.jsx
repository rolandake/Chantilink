// src/pages/videos/VideoCard.jsx - VERSION COMPLÈTE CORRIGÉE
import React, { useEffect, useRef, useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useVideos } from "../../context/VideoContext";
import { 
  FaHeart, 
  FaRegHeart, 
  FaComment, 
  FaShare, 
  FaBookmark,
  FaRegBookmark,
  FaMusic,
  FaVolumeUp,
  FaVolumeMute,
  FaPlay,
  FaPause,
  FaTrash,
  FaFlag,
  FaLink,
  FaDownload,
  FaUserSlash
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { RiUserAddLine, RiUserFollowLine } from "react-icons/ri";
import { IoSend } from "react-icons/io5";

// ✅ Fonction pour générer un avatar par défaut
const generateDefaultAvatar = (username = "User") => {
  const initial = username.charAt(0).toUpperCase();
  const colors = ['9CA3AF', 'EF4444', '3B82F6', '10B981', 'F59E0B', '8B5CF6', 'EC4899'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  return `data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100' height='100' fill='%23${color}'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='white' text-anchor='middle' dominant-baseline='middle'%3E${initial}%3C/text%3E%3C/svg%3E`;
};

// ✅ Fonction corrigée pour obtenir l'URL de l'avatar
const getAvatarUrl = (user) => {
  if (!user) {
    return generateDefaultAvatar();
  }
  
  const avatar = user.profilePhoto || user.profilePicture || user.avatar || user.photo;
  
  if (avatar) {
    if (avatar.startsWith('http') || avatar.startsWith('data:')) {
      return avatar;
    }
    
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseURL}${avatar.startsWith('/') ? avatar : '/' + avatar}`;
  }
  
  return generateDefaultAvatar(user.username || user.fullName);
};

const VideoCard = memo(({ video, isActive }) => {
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const isMountedRef = useRef(true); // 🔧 AJOUT
  
  if (!video) {
    return (
      <div className="relative w-full h-full flex justify-center items-center bg-black">
        <p className="text-white text-lg">Vidéo non disponible</p>
      </div>
    );
  }
  
  const { getActiveUser } = useAuth();
  const currentUser = getActiveUser();
  const { likeVideo, commentVideo, deleteVideo } = useVideos();

  const [muted, setMuted] = useState(true);
  const [showHeart, setShowHeart] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [localLikes, setLocalLikes] = useState(video?.likes || 0);
  const [localComments, setLocalComments] = useState(video?.comments || []);
  const [newComment, setNewComment] = useState("");

  const playAttemptRef = useRef(false);
  const debugLoggedRef = useRef(false);

  const videoOwnerData = useMemo(() => {
    const owner = video?.uploadedBy || video?.owner || video?.user || {};
    
    return {
      id: owner?._id || owner?.id,
      username: owner?.username || owner?.fullName || "Utilisateur",
      avatar: getAvatarUrl(owner),
      verified: owner?.isVerified || false
    };
  }, [video?.uploadedBy, video?.owner, video?.user]);

  const isOwner = useMemo(() => {
    return currentUser?.user?._id === videoOwnerData.id || 
           currentUser?.user?.id === videoOwnerData.id;
  }, [currentUser?.user?._id, currentUser?.user?.id, videoOwnerData.id]);

  useEffect(() => {
    if (!debugLoggedRef.current && video) {
      console.log("📹 [VideoCard] Données:", {
        videoId: video._id,
        owner: videoOwnerData,
        avatarUrl: videoOwnerData.avatar,
      });
      debugLoggedRef.current = true;
    }
  }, [video?._id, videoOwnerData]);

  // 🔧 CORRECTION: Gestion du montage/démontage
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      const vid = videoRef.current;
      
      if (vid) {
        requestAnimationFrame(() => {
          try {
            if (vid) {
              vid.pause();
              vid.src = '';
            }
          } catch (e) {
            console.warn("Erreur nettoyage vidéo:", e);
          }
        });
      }
    };
  }, []);

  // 🔧 CORRECTION: Gestion lecture automatique
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !isMountedRef.current) return;

    const playVideo = async () => {
      if (!isMountedRef.current) return;
      
      try {
        if (vid.readyState < 2) {
          await new Promise((resolve) => {
            const handler = () => {
              if (isMountedRef.current) resolve();
            };
            vid.addEventListener("loadeddata", handler, { once: true });
            setTimeout(() => resolve(), 3000);
          });
        }

        if (!isMountedRef.current) return;

        if (video.startTime && !playAttemptRef.current) {
          vid.currentTime = video.startTime;
        }

        if (isMountedRef.current) {
          await vid.play();
          playAttemptRef.current = true;
          setIsPaused(false);
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        
        if (err.name === "NotAllowedError") {
          try {
            setMuted(true);
            vid.muted = true;
            if (isMountedRef.current) {
              await vid.play();
              playAttemptRef.current = true;
              setIsPaused(false);
            }
          } catch (retryErr) {
            if (isMountedRef.current) {
              setError("Impossible de lire la vidéo");
            }
          }
        }
      }
    };

    if (isActive) {
      playVideo();
    } else {
      vid.pause();
      setIsPaused(true);
      playAttemptRef.current = false;
    }

    return () => {
      if (vid) {
        requestAnimationFrame(() => {
          try {
            vid.pause();
          } catch (e) {
            console.warn("Erreur pause:", e);
          }
        });
      }
    };
  }, [isActive, video.startTime]);

  // 🔧 CORRECTION: Segment de lecture
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !video.endTime || !isMountedRef.current) return;

    const handleTimeUpdate = () => {
      if (!isMountedRef.current) return;
      
      const currentTime = vid.currentTime;
      const duration = video.endTime - (video.startTime || 0);
      setProgress((currentTime - (video.startTime || 0)) / duration * 100);

      if (currentTime >= video.endTime) {
        vid.currentTime = video.startTime || 0;
      }
    };

    vid.addEventListener("timeupdate", handleTimeUpdate);
    
    return () => {
      if (vid) {
        vid.removeEventListener("timeupdate", handleTimeUpdate);
      }
    };
  }, [video.startTime, video.endTime]);

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLike();
    }
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1000);
  };

  // 🔧 CORRECTION: Vérification isMountedRef
  const handleToggleMute = () => {
    const vid = videoRef.current;
    if (!vid || !isMountedRef.current) return;
    
    const newMuted = !muted;
    setMuted(newMuted);
    vid.muted = newMuted;
  };

  // 🔧 CORRECTION: Vérification isMountedRef
  const handlePlayPause = () => {
    const vid = videoRef.current;
    if (!vid || !isMountedRef.current) return;
    
    if (vid.paused) {
      vid.play().catch(e => console.warn('Play error:', e));
      setIsPaused(false);
    } else {
      vid.pause();
      setIsPaused(true);
    }
  };

  const handleLike = async () => {
    const wasLiked = isLiked;
    setIsLiked(!isLiked);
    setLocalLikes(prev => wasLiked ? prev - 1 : prev + 1);
    
    try {
      if (likeVideo) {
        await likeVideo(video._id);
      }
    } catch (err) {
      console.error("Erreur like:", err);
      setIsLiked(wasLiked);
      setLocalLikes(prev => wasLiked ? prev + 1 : prev - 1);
    }
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    const message = !isSaved ? "✅ Vidéo ajoutée aux favoris" : "❌ Vidéo retirée des favoris";
    alert(message);
    setShowOptions(false);
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title || "Vidéo",
          text: video?.description || "",
          url: window.location.href,
        });
      } catch (err) {
        console.log("Partage annulé");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("🔗 Lien copié !");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("🔗 Lien copié dans le presse-papier !");
    setShowOptions(false);
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
      setShowOptions(false);
    } catch (err) {
      console.error("Erreur téléchargement:", err);
      alert("❌ Erreur lors du téléchargement");
    }
  };

  const handleReport = () => {
    alert("⚠️ Vidéo signalée. Notre équipe va examiner ce contenu.");
    setShowOptions(false);
  };

  const handleBlock = () => {
    if (window.confirm(`Bloquer @${videoOwnerData.username} ? Vous ne verrez plus leurs vidéos.`)) {
      alert(`🚫 @${videoOwnerData.username} a été bloqué`);
      setShowOptions(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("🗑️ Supprimer cette vidéo définitivement ?")) return;
    
    try {
      if (deleteVideo) {
        await deleteVideo(video._id);
        alert("✅ Vidéo supprimée avec succès");
        setShowOptions(false);
      }
    } catch (err) {
      console.error("Erreur suppression:", err);
      alert("❌ Erreur lors de la suppression");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    const comment = {
      id: Date.now(),
      user: {
        _id: currentUser?.user?._id,
        username: currentUser?.user?.username || currentUser?.user?.fullName,
        fullName: currentUser?.user?.fullName,
        profilePicture: getAvatarUrl(currentUser?.user),
        avatar: getAvatarUrl(currentUser?.user),
        email: currentUser?.user?.email,
        isVerified: currentUser?.user?.isVerified,
      },
      text: newComment,
      createdAt: new Date(),
    };
    
    setLocalComments([...localComments, comment]);
    setNewComment("");
    
    try {
      if (commentVideo) {
        await commentVideo(video._id, newComment);
      }
    } catch (err) {
      console.error("Erreur commentaire:", err);
      setLocalComments(localComments);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num?.toString() || "0";
  };

  return (
    <div className="relative w-full h-full flex justify-center items-center bg-black overflow-hidden">
      {/* Loading */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Vidéo */}
      <video
        ref={videoRef}
        src={video.url}
        className="w-full h-full object-cover"
        style={{ filter: video.filter || "none" }}
        loop
        muted={muted}
        playsInline
        preload="metadata"
        onDoubleClick={handleDoubleTap}
        onClick={handlePlayPause}
        onLoadedData={() => setIsLoading(false)}
        onError={() => setError("Erreur de chargement")}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

      {/* Badge LIVE */}
      {video.isLive && (
        <div className="absolute top-6 left-4 z-30">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gradient-to-r from-red-600 to-pink-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span>LIVE</span>
            </div>
            <div className="bg-black/80 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              <span>👁 {formatNumber(video.viewers || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {!video.isLive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-30">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Play/Pause overlay */}
      {isPaused && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        >
          <div className="w-20 h-20 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center">
            <FaPlay className="text-white text-3xl ml-1" />
          </div>
        </motion.div>
      )}

      {/* Overlay texte */}
      {video.textOverlay && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute text-3xl font-black pointer-events-none z-20"
          style={{
            color: video.textColor || "#ffffff",
            left: `${video.textPos?.x || 50}%`,
            top: `${video.textPos?.y || 10}%`,
            transform: "translate(-50%, -50%)",
            textShadow: "0 0 20px rgba(0,0,0,0.8), 2px 2px 8px rgba(0,0,0,0.6)",
            letterSpacing: "0.05em",
          }}
        >
          <span>{video.textOverlay}</span>
        </motion.div>
      )}

      {/* Animation cœur double-tap */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1.3], opacity: [0, 1, 0] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <FaHeart className="text-red-500 drop-shadow-2xl" style={{ fontSize: "8rem" }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions latérales (droite) */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-40">
        {/* Avatar + Follow */}
        <div className="relative">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative"
          >
            <img
              src={videoOwnerData.avatar}
              alt={videoOwnerData.username}
              className="w-14 h-14 rounded-full object-cover border-2 border-white cursor-pointer shadow-lg"
              onClick={() => videoOwnerData.id && navigate(`/profile/${videoOwnerData.id}`)}
              onError={(e) => {
                console.error("❌ Erreur chargement avatar:", videoOwnerData.avatar);
                e.target.src = generateDefaultAvatar(videoOwnerData.username);
              }}
            />
            {videoOwnerData.verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-black">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </motion.div>
          
          {!isOwner && (
            <motion.button
              onClick={handleFollow}
              whileTap={{ scale: 0.9 }}
              className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all ${
                isFollowing 
                  ? "bg-gray-400" 
                  : "bg-gradient-to-br from-red-500 to-pink-600"
              }`}
            >
              {isFollowing ? (
                <RiUserFollowLine className="text-white text-sm" />
              ) : (
                <RiUserAddLine className="text-white text-sm" />
              )}
            </motion.button>
          )}
        </div>

        {/* Like */}
        <motion.button
          onClick={handleLike}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-1"
        >
          <motion.div
            animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isLiked 
                ? "bg-gradient-to-br from-red-500 to-pink-600" 
                : "bg-black/60 backdrop-blur-md"
            }`}
          >
            {isLiked ? (
              <FaHeart className="text-white text-xl" />
            ) : (
              <FaRegHeart className="text-white text-xl" />
            )}
          </motion.div>
          <span className="text-white text-xs font-bold drop-shadow-lg">
            {formatNumber(localLikes)}
          </span>
        </motion.button>

        {/* Comment */}
        <motion.button
          onClick={() => setShowComments(!showComments)}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center">
            <FaComment className="text-white text-xl" />
          </div>
          <span className="text-white text-xs font-bold drop-shadow-lg">
            {formatNumber(localComments.length)}
          </span>
        </motion.button>

        {/* Share */}
        <motion.button
          onClick={handleShare}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center">
            <FaShare className="text-white text-xl" />
          </div>
        </motion.button>

        {/* Mute */}
        <motion.button
          onClick={handleToggleMute}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center">
            {muted ? <FaVolumeMute className="text-white" size={20} /> : <FaVolumeUp className="text-white" size={20} />}
          </div>
        </motion.button>

        {/* Options */}
        <motion.button
          onClick={() => setShowOptions(!showOptions)}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center">
            <HiDotsVertical className="text-white" size={20} />
          </div>
        </motion.button>

        {/* Music */}
        {video.musicName && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg"
          >
            <FaMusic className="text-white text-sm" />
          </motion.div>
        )}
      </div>

      {/* Infos vidéo (bas gauche) */}
      <div className="absolute bottom-20 left-4 right-24 text-white z-40 space-y-2">
        <div className="flex items-center gap-2">
          <motion.div
            whileHover={{ scale: 1.05 }}
            onClick={() => videoOwnerData.id && navigate(`/profile/${videoOwnerData.id}`)}
            className="cursor-pointer"
          >
            <p className="font-bold text-base drop-shadow-lg hover:underline">
              @{videoOwnerData.username}
            </p>
          </motion.div>
          {videoOwnerData.verified && (
            <span className="text-blue-400 text-sm">✓</span>
          )}
        </div>

        {video.title && (
          <p className="font-semibold text-sm drop-shadow-lg line-clamp-1">
            {video.title}
          </p>
        )}

        {video.description && (
          <p className="text-sm opacity-90 drop-shadow-lg line-clamp-2">
            {video.description}
          </p>
        )}

        {video.musicName && (
          <div className="flex items-center gap-2 mt-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full inline-flex">
            <FaMusic className="text-xs" />
            <span className="text-xs font-medium truncate max-w-[200px]">
              {video.musicName}
            </span>
          </div>
        )}
      </div>

      {/* Panel Commentaires */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl z-50 rounded-t-3xl flex flex-col shadow-2xl"
            style={{
              maxHeight: "calc(100vh - 100px)",
              paddingBottom: "env(safe-area-inset-bottom, 20px)"
            }}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-bold text-lg">
                {localComments.length} commentaire{localComments.length > 1 ? "s" : ""}
              </h3>
              <button
                onClick={() => setShowComments(false)}
                className="text-gray-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {localComments.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  Aucun commentaire. Soyez le premier !
                </p>
              ) : (
                localComments.map((comment, idx) => (
                  <div key={idx} className="flex gap-3">
                    <img
                      src={getAvatarUrl(comment.user)}
                      alt={comment.user?.username}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.src = generateDefaultAvatar(comment.user?.username);
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm">
                          {comment.user?.username || comment.user?.fullName || "Utilisateur"}
                        </span>
                        {comment.user?.isVerified && (
                          <span className="text-blue-400 text-xs">✓</span>
                        )}
                        <span className="text-gray-500 text-xs">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mt-1">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
                  placeholder="Ajouter un commentaire..."
                  className="flex-1 bg-gray-700/50 text-white px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-400"
                />
                <motion.button
                  onClick={handleAddComment}
                  whileTap={{ scale: 0.95 }}
                  disabled={!newComment.trim()}
                  className="w-12 h-12 bg-gradient-to-r from-orange-500 to-pink-600 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IoSend className="text-white text-xl" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Options */}
      <AnimatePresence>
        {showOptions && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
              onClick={() => setShowOptions(false)}
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed inset-0 flex items-center justify-center z-[70] p-4"
            >
              <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                      <HiDotsVertical className="text-orange-500" />
                    </div>
                    <h3 className="text-white font-bold text-lg">Options</h3>
                  </div>
                </div>

                <div className="p-2 max-h-[60vh] overflow-y-auto">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left hover:bg-gray-700/50 transition-colors group"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-yellow-500/30 transition ${
                      isSaved ? "bg-yellow-500/30" : "bg-yellow-500/20"
                    }`}>
                      {isSaved ? (
                        <FaBookmark className="text-yellow-400" />
                      ) : (
                        <FaRegBookmark className="text-yellow-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {isSaved ? "Retirer des favoris" : "Ajouter aux favoris"}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {isSaved ? "Supprimer de la collection" : "Sauvegarder cette vidéo"}
                      </p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left hover:bg-gray-700/50 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30 transition">
                      <FaLink className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Copier le lien</p>
                      <p className="text-gray-400 text-sm">Partager cette vidéo</p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDownload}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left hover:bg-gray-700/50 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center group-hover:bg-green-500/30 transition">
                      <FaDownload className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Télécharger</p>
                      <p className="text-gray-400 text-sm">Enregistrer sur l'appareil</p>
                    </div>
                  </motion.button>

                  {!isOwner && (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={handleReport}
                      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left hover:bg-gray-700/50 transition-colors group"
                    >
                      <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center group-hover:bg-orange-500/30 transition">
                        <FaFlag className="text-orange-400" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">Signaler</p>
                        <p className="text-gray-400 text-sm">Contenu inapproprié</p>
                      </div>
                    </motion.button>
                  )}

                  {!isOwner && (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBlock}
                      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left hover:bg-gray-700/50 transition-colors group"
                    >
                      <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center group-hover:bg-red-500/30 transition">
                        <FaUserSlash className="text-red-400" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">Bloquer @{videoOwnerData.username}</p>
                        <p className="text-gray-400 text-sm">Ne plus voir leurs vidéos</p>
                      </div>
                    </motion.button>
                  )}

                  {isOwner && (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDelete}
                      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left hover:bg-red-500/10 transition-colors group"
                    >
                      <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center group-hover:bg-red-500/30 transition">
                        <FaTrash className="text-red-400" />
                      </div>
                      <div>
                        <p className="text-red-400 font-semibold">Supprimer</p>
                        <p className="text-gray-400 text-sm">Action irréversible</p>
                      </div>
                    </motion.button>
                  )}
                </div>

                <div className="p-4 border-t border-gray-700/50">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowOptions(false)}
                    className="w-full py-3 bg-gray-700/50 hover:bg-gray-700 text-white font-semibold rounded-2xl transition"
                  >
                    Annuler
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.video?._id === nextProps.video?._id &&
    prevProps.isActive === nextProps.isActive
  );
});

VideoCard.displayName = 'VideoCard';

export default VideoCard;