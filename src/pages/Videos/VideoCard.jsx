// src/pages/videos/VideoCard.jsx - CORRECTION BUG REMOVECHILD
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

const generateDefaultAvatar = (username = "User") => {
  const initial = username.charAt(0).toUpperCase();
  const colors = ['9CA3AF', 'EF4444', '3B82F6', '10B981', 'F59E0B', '8B5CF6', 'EC4899'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  return `data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100' height='100' fill='%23${color}'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='white' text-anchor='middle' dominant-baseline='middle'%3E${initial}%3C/text%3E%3C/svg%3E`;
};

const getAvatarUrl = (user) => {
  if (!user) return generateDefaultAvatar();
  
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
  const isMountedRef = useRef(true);
  const cleanupTimeoutRef = useRef(null); // 🔧 AJOUT
  
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

  // 🔧 CORRECTION: Nettoyage amélioré avec délai
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Annuler les timeouts en attente
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      
      const vid = videoRef.current;
      
      if (vid) {
        // Utiliser un micro-délai pour éviter les conflits DOM
        cleanupTimeoutRef.current = setTimeout(() => {
          try {
            if (vid && vid.parentNode) { // ✅ Vérifier que l'élément est toujours dans le DOM
              vid.pause();
              vid.removeAttribute('src');
              vid.load();
            }
          } catch (e) {
            // Ignorer silencieusement les erreurs de nettoyage
          }
        }, 0);
      }
    };
  }, []);

  // 🔧 CORRECTION: Lecture avec vérification DOM
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !isMountedRef.current) return;

    const playVideo = async () => {
      if (!isMountedRef.current || !vid.parentNode) return; // ✅ Vérifier présence DOM
      
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

        if (!isMountedRef.current || !vid.parentNode) return; // ✅ Re-vérifier

        if (video.startTime && !playAttemptRef.current) {
          vid.currentTime = video.startTime;
        }

        if (isMountedRef.current && vid.parentNode) { // ✅ Vérifier avant play
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
            if (isMountedRef.current && vid.parentNode) {
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
      if (vid.parentNode) { // ✅ Vérifier avant pause
        vid.pause();
        setIsPaused(true);
        playAttemptRef.current = false;
      }
    }

    return () => {
      if (vid && vid.parentNode) { // ✅ Vérifier avant pause
        try {
          vid.pause();
        } catch (e) {
          // Ignorer
        }
      }
    };
  }, [isActive, video.startTime]);

  // 🔧 CORRECTION: TimeUpdate avec vérification
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !video.endTime || !isMountedRef.current) return;

    const handleTimeUpdate = () => {
      if (!isMountedRef.current || !vid.parentNode) return; // ✅ Vérifier DOM
      
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
    setTimeout(() => {
      if (isMountedRef.current) {
        setShowHeart(false);
      }
    }, 1000);
  };

  const handleToggleMute = () => {
    const vid = videoRef.current;
    if (!vid || !isMountedRef.current || !vid.parentNode) return; // ✅ Vérifier
    
    const newMuted = !muted;
    setMuted(newMuted);
    vid.muted = newMuted;
  };

  const handlePlayPause = () => {
    const vid = videoRef.current;
    if (!vid || !isMountedRef.current || !vid.parentNode) return; // ✅ Vérifier
    
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
      if (isMountedRef.current) {
        setIsLiked(wasLiked);
        setLocalLikes(prev => wasLiked ? prev + 1 : prev - 1);
      }
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
      if (isMountedRef.current) {
        setLocalComments(localComments);
      }
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
        onLoadedData={() => isMountedRef.current && setIsLoading(false)}
        onError={() => isMountedRef.current && setError("Erreur de chargement")}
      />

      {/* Reste du JSX identique... */}
      {/* (Copier tout le reste du composant sans modification) */}
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