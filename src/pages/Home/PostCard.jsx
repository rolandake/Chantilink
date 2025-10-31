// src/pages/Home/PostCard.jsx - VERSION COMPLÈTE CORRIGÉE
import React, { forwardRef, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  TrashIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  UserPlusIcon,
  UserMinusIcon,
  MapPinIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import { FaCheckCircle, FaCrown } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { usePosts } from "../../context/PostsContext";
import { idbGet, idbSet } from "../../utils/idbMigration";
import EmojiPicker from "emoji-picker-react";

// ============================================
// 🎨 Avatar avec photo de profil
// ============================================
const SimpleAvatar = ({ username, profilePhoto, size = 32 }) => {
  const [imageError, setImageError] = useState(false);
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  const getPhotoUrl = (photo) => {
    if (!photo) return null;
    if (photo.startsWith('http')) return photo;
    return `${base}${photo.startsWith('/') ? photo : `/${photo}`}`;
  };

  const photoUrl = getPhotoUrl(profilePhoto);

  if (photoUrl && !imageError) {
    return (
      <img
        src={photoUrl}
        alt={username}
        className="rounded-full object-cover border-2 border-orange-200"
        style={{ width: size, height: size }}
        onError={() => {
          console.log('❌ Erreur chargement photo:', photoUrl);
          setImageError(true);
        }}
        onLoad={() => console.log('✅ Photo chargée:', photoUrl)}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold border-2 border-orange-200"
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

const PostCard = forwardRef(({ post, onDeleted, showToast }, ref) => {
  const { user: currentUser, getToken } = useAuth();
  const { deletePost, updatePost } = usePosts();
  const navigate = useNavigate();

  // ✅ EXTRACTION SIMPLIFIÉE et ROBUSTE des données utilisateur
  const postUser = useMemo(() => {
    if (post.user && typeof post.user === 'object' && post.user._id) {
      return {
        _id: post.user._id,
        fullName: post.user.fullName || post.user.username || "Utilisateur",
        profilePhoto: post.user.profilePhoto || null,
        isVerified: Boolean(post.user.isVerified),
        isPremium: Boolean(post.user.isPremium),
      };
    }
    
    if (typeof post.user === 'string') {
      return {
        _id: post.user,
        fullName: post.fullName || post.userName || "Utilisateur",
        profilePhoto: post.userProfilePhoto || null,
        isVerified: Boolean(post.isVerified || post.userIsVerified),
        isPremium: Boolean(post.isPremium || post.userIsPremium),
      };
    }

    return {
      _id: post.userId || "unknown",
      fullName: post.fullName || post.userName || "Utilisateur",
      profilePhoto: post.userProfilePhoto || post.profilePhoto || null,
      isVerified: Boolean(post.isVerified || post.userIsVerified),
      isPremium: Boolean(post.isPremium || post.userIsPremium),
    };
  }, [post]);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(Array.isArray(post.likes) ? post.likes.length : 0);
  const [animateHeart, setAnimateHeart] = useState(false);

  const [comments, setComments] = useState(Array.isArray(post.comments) ? post.comments : []);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingComment, setLoadingComment] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  const mediaContainerRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const localLikesKey = `postLikes_${post._id}`;
  const localCommentsKey = `postComments_${post._id}`;
  const localFollowKey = `userFollow_${postUser._id}`;

  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // ✅ Fermer le picker d'emoji si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // ✅ Charger les états depuis le cache
  useEffect(() => {
    let mounted = true;

    const loadFromCache = async () => {
      try {
        const [cachedLiked, cachedComments, cachedFollow] = await Promise.all([
          idbGet("posts", localLikesKey),
          idbGet("posts", localCommentsKey),
          idbGet("posts", localFollowKey)
        ]);

        if (!mounted) return;

        if (cachedLiked !== undefined) {
          setLiked(cachedLiked);
        } else if (currentUser && Array.isArray(post.likes)) {
          const isLiked = post.likes.some(id => id === currentUser._id || id === currentUser.id);
          setLiked(isLiked);
          await idbSet("posts", localLikesKey, isLiked);
        }

        if (cachedComments) {
          setComments(cachedComments);
        }

        if (cachedFollow !== undefined) {
          setIsFollowing(cachedFollow);
        } else if (currentUser && Array.isArray(currentUser.following)) {
          const following = currentUser.following.some(id => id === postUser._id);
          setIsFollowing(following);
          await idbSet("posts", localFollowKey, following);
        }
      } catch (err) {
        console.warn("⚠️ Erreur chargement cache:", err);
      }
    };

    loadFromCache();
    return () => { mounted = false; };
  }, [post._id, postUser._id, post.likes, currentUser, localLikesKey, localCommentsKey, localFollowKey]);

  const saveDebounced = useCallback((key) => {
    let timeout;
    return (value) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => idbSet("posts", key, value), 300);
    };
  }, []);

  const saveLikesDebounced = useMemo(() => saveDebounced(localLikesKey), [saveDebounced, localLikesKey]);
  const saveCommentsDebounced = useMemo(() => saveDebounced(localCommentsKey), [saveDebounced, localCommentsKey]);
  const saveFollowDebounced = useMemo(() => saveDebounced(localFollowKey), [saveDebounced, localFollowKey]);

  const handleLike = async () => {
    if (!currentUser) return showToast?.("Connectez-vous pour liker", "error");
    if (loadingLike) return;

    const prevLiked = liked;
    const prevCount = likesCount;

    setLiked(!prevLiked);
    setLikesCount(prevLiked ? likesCount - 1 : likesCount + 1);
    setAnimateHeart(!prevLiked);
    saveLikesDebounced(!prevLiked);
    setLoadingLike(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Non authentifié");

      const res = await fetch(`${base}/api/posts/${post._id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include"
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const updated = await res.json();
      setLikesCount(updated.likes.length);
      const isLiked = updated.likes.some(id => id === currentUser._id || id === currentUser.id);
      setLiked(isLiked);
      saveLikesDebounced(isLiked);
      updatePost(updated);
    } catch (err) {
      console.error("❌ Erreur like:", err);
      setLiked(prevLiked);
      setLikesCount(prevCount);
      saveLikesDebounced(prevLiked);
    } finally {
      setLoadingLike(false);
      setTimeout(() => setAnimateHeart(false), 500);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || currentUser._id === postUser._id) return;
    if (loadingFollow) return;

    const prevFollowing = isFollowing;
    const endpoint = prevFollowing 
      ? `${base}/api/users/${postUser._id}/unfollow` 
      : `${base}/api/users/${postUser._id}/follow`;

    setIsFollowing(!prevFollowing);
    saveFollowDebounced(!prevFollowing);
    setLoadingFollow(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Non authentifié");

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include"
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const nowFollowing = !prevFollowing;
      setIsFollowing(nowFollowing);
      saveFollowDebounced(nowFollowing);
      showToast?.(nowFollowing ? `✅ Vous suivez ${postUser.fullName}` : `Vous ne suivez plus ${postUser.fullName}`, "success");
    } catch (err) {
      console.error("❌ Erreur follow:", err);
      setIsFollowing(prevFollowing);
      saveFollowDebounced(prevFollowing);
      showToast?.(err.message || "Erreur", "error");
    } finally {
      setLoadingFollow(false);
    }
  };

  const handleAddComment = async () => {
    if (!currentUser) return showToast?.("Connectez-vous pour commenter", "error");
    if (!newComment.trim()) return showToast?.("Le commentaire est vide", "error");

    const commentContent = newComment.trim();
    const optimisticComment = {
      _id: `temp-${Date.now()}`,
      content: commentContent,
      user: {
        _id: currentUser._id,
        fullName: currentUser.fullName,
        profilePhoto: currentUser.profilePhoto
      },
      createdAt: new Date().toISOString()
    };

    const updatedComments = [...comments, optimisticComment];
    setComments(updatedComments);
    setNewComment("");
    setShowEmojiPicker(false);
    saveCommentsDebounced(updatedComments);
    setLoadingComment(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Non authentifié");

      const res = await fetch(`${base}/api/posts/${post._id}/comment`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: commentContent }),
        credentials: "include"
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Erreur ${res.status}`);
      }

      const savedComment = await res.json();
      const finalComments = updatedComments.map(c => 
        c._id === optimisticComment._id ? savedComment : c
      );
      setComments(finalComments);
      saveCommentsDebounced(finalComments);
      showToast?.("✅ Commentaire ajouté", "success");

    } catch (err) {
      console.error("❌ Erreur commentaire:", err);
      const rolledBack = comments.filter(c => c._id !== optimisticComment._id);
      setComments(rolledBack);
      saveCommentsDebounced(rolledBack);
      setNewComment(commentContent);
      showToast?.(err.message || "Erreur lors de l'ajout du commentaire", "error");
    } finally {
      setLoadingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Supprimer ce commentaire ?")) return;
    setDeletingCommentId(commentId);

    try {
      const token = await getToken();
      if (!token) throw new Error("Non authentifié");

      const res = await fetch(`${base}/api/posts/${post._id}/comment/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include"
      });

      if (!res.ok) throw new Error("Erreur suppression");

      const newComments = comments.filter(c => c._id !== commentId);
      setComments(newComments);
      saveCommentsDebounced(newComments);
      showToast?.("✅ Commentaire supprimé", "success");
    } catch (err) {
      console.error("❌ Erreur suppression commentaire:", err);
      showToast?.(err.message || "Erreur suppression", "error");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Supprimer ce post ?")) return;
    setLoadingDelete(true);
    try {
      await deletePost(post._id);
      showToast?.("✅ Post supprimé", "success");
      onDeleted?.(post._id);
    } catch (err) {
      console.error("❌ Erreur suppression:", err);
      showToast?.("Erreur suppression", "error");
    } finally {
      setLoadingDelete(false);
    }
  };

  const getMediaUrls = (media) => {
    if (!media) return [];
    const medias = Array.isArray(media) ? media : [media];
    return medias
      .map(m => {
        const url = typeof m === "string" ? m : m?.url || m?.path || m?.location;
        if (!url) return null;
        return url.startsWith("http") ? url : `${base}${url.startsWith("/") ? url : `/${url}`}`;
      })
      .filter(Boolean);
  };

  const mediaUrls = getMediaUrls(post.media);
  const isVideo = (url) => /\.(mp4|webm|mov)$/i.test(url);

  const handlePrevMedia = () => {
    setCurrentMediaIndex((prev) => (prev === 0 ? mediaUrls.length - 1 : prev - 1));
  };

  const handleNextMedia = () => {
    setCurrentMediaIndex((prev) => (prev === mediaUrls.length - 1 ? 0 : prev + 1));
  };

  const handleMediaMouseDown = (e) => {
    if (mediaUrls.length <= 1) return;
    setIsDragging(true);
    setDragStart(e.clientX || e.touches?.[0]?.clientX);
  };

  const handleMediaMouseUp = (e) => {
    if (!isDragging || mediaUrls.length <= 1) return;
    setIsDragging(false);
    
    const dragEnd = e.clientX || e.changedTouches?.[0]?.clientX;
    const diff = dragStart - dragEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNextMedia();
      else handlePrevMedia();
    }
  };

  const onEmojiClick = (emojiObject) => {
    setNewComment(prev => prev + emojiObject.emoji);
  };

  const formattedDate = post.createdAt ? new Date(post.createdAt).toLocaleString("fr-FR") : "";
  const isOwner = currentUser && (post.userId === currentUser._id || postUser._id === currentUser._id || post.user?._id === currentUser._id);
  const canFollow = currentUser && postUser._id && postUser._id !== currentUser._id && postUser._id !== 'unknown';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition p-4 space-y-3 relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => {
              if (postUser._id && postUser._id !== 'unknown') {
                navigate(`/profile/${postUser._id}`);
              } else {
                showToast?.("Impossible d'accéder à ce profil", "error");
              }
            }}
            className="hover:opacity-80 transition flex-shrink-0 hover:scale-110"
            title={`Voir le profil de ${postUser.fullName}`}
          >
            <SimpleAvatar 
              username={postUser.fullName} 
              profilePhoto={postUser.profilePhoto} 
              size={40} 
            />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => {
                  if (postUser._id && postUser._id !== 'unknown') {
                    navigate(`/profile/${postUser._id}`);
                  }
                }}
                className="font-semibold text-gray-800 text-base hover:text-orange-600 transition text-left truncate hover:underline"
              >
                {postUser.fullName}
              </button>
              {postUser.isVerified && (
                <FaCheckCircle className="text-orange-500 text-sm flex-shrink-0" title="Certifié" />
              )}
              {postUser.isPremium && (
                <FaCrown className="text-yellow-500 text-sm flex-shrink-0" title="Premium" />
              )}
            </div>
            <p className="text-xs text-gray-400">{formattedDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {canFollow && (
            <button
              onClick={handleFollow}
              disabled={loadingFollow}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition disabled:opacity-50 whitespace-nowrap ${
                isFollowing ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-orange-500 text-white hover:bg-orange-600"
              }`}
            >
              {/* ✅ CORRECTION : Rendu conditionnel stable */}
              {isFollowing ? (
                <>
                  <UserMinusIcon className="w-4 h-4" />
                  <span>Abonné</span>
                </>
              ) : (
                <>
                  <UserPlusIcon className="w-4 h-4" />
                  <span>Suivre</span>
                </>
              )}
            </button>
          )}
          {isOwner && (
            <button onClick={handleDelete} disabled={loadingDelete} className="p-2 rounded-full text-red-500 hover:bg-red-50 transition disabled:opacity-50 flex-shrink-0">
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Contenu */}
      {post.content && <p className="text-gray-700 whitespace-pre-line leading-relaxed">{post.content}</p>}

      {/* Localisation */}
      {post.location && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-orange-50 px-3 py-2 rounded-lg">
          <MapPinIcon className="w-4 h-4 text-orange-500" />
          <span>{post.location}</span>
        </div>
      )}

      {/* Médias */}
      {mediaUrls.length > 0 && (
        <div 
          ref={mediaContainerRef}
          className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 group cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMediaMouseDown}
          onMouseUp={handleMediaMouseUp}
          onMouseLeave={() => setIsDragging(false)}
          onTouchStart={handleMediaMouseDown}
          onTouchEnd={handleMediaMouseUp}
        >
          <motion.div
            animate={{ x: -currentMediaIndex * 100 + "%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full h-full flex"
          >
            {mediaUrls.map((url, idx) => (
              <div key={idx} className="w-full h-full flex-shrink-0">
                {isVideo(url) ? (
                  <video src={url} controls className="w-full h-full object-cover" />
                ) : (
                  <img 
                    src={url} 
                    alt="media" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage non disponible%3C/text%3E%3C/svg%3E";
                    }}
                  />
                )}
              </div>
            ))}
          </motion.div>

          {mediaUrls.length > 1 && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-20 cursor-pointer hover:bg-black/10 transition sm:hidden" onClick={handlePrevMedia} />
              <div className="absolute right-0 top-0 bottom-0 w-20 cursor-pointer hover:bg-black/10 transition sm:hidden" onClick={handleNextMedia} />

              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                {mediaUrls.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentMediaIndex(idx)}
                    className={`w-2 h-2 rounded-full transition ${
                      idx === currentMediaIndex ? "bg-white scale-125" : "bg-white/50 hover:bg-white/75"
                    }`}
                  />
                ))}
              </div>

              <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded-full text-xs font-medium">
                {currentMediaIndex + 1} / {mediaUrls.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button onClick={handleLike} disabled={loadingLike} className="flex items-center gap-1 hover:scale-110 transition-transform">
          {liked ? (
            <HeartIconSolid 
              className={`w-5 h-5 text-red-500 ${animateHeart ? "animate-bounce" : ""}`} 
            />
          ) : (
            <HeartIcon className="w-5 h-5 text-gray-500 hover:text-red-500 transition-colors" />
          )}
          <span className="text-sm text-gray-600 font-medium">{likesCount}</span>
        </button>

        <button 
          onClick={() => setShowComments(!showComments)} 
          className="flex items-center gap-1 hover:scale-110 transition-transform"
        >
          <ChatBubbleLeftIcon className="w-5 h-5 text-gray-500 hover:text-orange-500 transition-colors" />
          <span className="text-sm text-gray-600 font-medium">{comments.length}</span>
        </button>
      </div>

      {/* Commentaires */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }} 
            exit={{ opacity: 0, height: 0 }} 
            className="space-y-2 mt-2 max-h-60 overflow-y-auto bg-gray-50 rounded-xl p-3"
          >
            {comments.map(c => (
              <motion.div 
                key={c._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-start gap-2 group"
              >
                <button
                  onClick={() => navigate(`/profile/${c.user._id}`)}
                  className="hover:opacity-80 transition flex-shrink-0 hover:scale-110"
                >
                  <SimpleAvatar 
                    username={c.user.fullName} 
                    profilePhoto={c.user.profilePhoto} 
                    size={28} 
                  />
                </button>
                <div className="bg-white rounded-xl px-3 py-2 flex-1 shadow-sm border border-gray-200">
                  <button
                    onClick={() => navigate(`/profile/${c.user._id}`)}
                    className="text-sm font-semibold hover:text-orange-600 transition text-left hover:underline"
                  >
                    {c.user.fullName}
                  </button>
                  <p className="text-sm text-gray-700 break-words">{c.content}</p>
                </div>
                {currentUser && currentUser._id === c.user._id && (
                  <button
                    onClick={() => handleDeleteComment(c._id)}
                    disabled={deletingCommentId === c._id}
                    className="opacity-0 group-hover:opacity-100 transition text-red-500 hover:bg-red-50 p-1.5 rounded-full disabled:opacity-50"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}

            <div className="relative space-y-2 pt-2 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ajouter un commentaire..."
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
                  disabled={loadingComment}
                />
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-2xl hover:scale-110 transition flex-shrink-0"
                  title="Ajouter un emoji"
                >
                  😊
                </button>
                <button 
                  onClick={handleAddComment} 
                  disabled={loadingComment || !newComment.trim()} 
                  className="bg-orange-500 text-white px-3 py-2 rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-sm flex-shrink-0"
                >
                  {loadingComment ? "..." : "Envoyer"}
                </button>
              </div>

              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-full mb-2 right-0 z-[9999] shadow-2xl">
                  <EmojiPicker 
                    onEmojiClick={onEmojiClick} 
                    theme="light"
                    width={300}
                    height={400}
                    searchDisabled={false}
                    skinTonesDisabled={false}
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

PostCard.displayName = "PostCard";
export default PostCard;