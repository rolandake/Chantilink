// src/pages/videos/VideoActions.jsx - Version simplifiée moderne
// ⚠️ NOTE: Ce composant peut être utilisé seul ou intégré directement dans VideoCard
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useVideos } from "../../context/VideoContext";
import { 
  FaHeart, 
  FaRegHeart, 
  FaComment, 
  FaShare, 
  FaBookmark,
  FaRegBookmark,
  FaTrash,
  FaFlag,
  FaLink
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { IoSend } from "react-icons/io5";

const VideoActions = ({ video, token, isActive }) => {
  const { getActiveUser } = useAuth();
  const { likeVideo, commentVideo, deleteVideo, socket } = useVideos();
  const currentUser = getActiveUser();

  const [showComments, setShowComments] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [localVideo, setLocalVideo] = useState(video);
  const [newComment, setNewComment] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  // Sync avec props
  useEffect(() => setLocalVideo(video), [video]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !isActive) return;

    const handleVideoLiked = ({ videoId, likes, userId }) => {
      if (videoId === video._id) {
        setLocalVideo(prev => ({
          ...prev,
          likes: likes ?? (prev.likes || 0) + 1,
          userLiked: userId === currentUser?.id ? true : prev.userLiked,
        }));
      }
    };

    const handleCommentAdded = ({ videoId, comment }) => {
      if (videoId === video._id) {
        setLocalVideo(prev => ({
          ...prev,
          comments: [...(prev.comments || []), comment],
        }));
      }
    };

    socket.on("videoLiked", handleVideoLiked);
    socket.on("commentAdded", handleCommentAdded);

    return () => {
      socket.off("videoLiked", handleVideoLiked);
      socket.off("commentAdded", handleCommentAdded);
    };
  }, [socket, video._id, currentUser, isActive]);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const wasLiked = localVideo.userLiked;
    const newLikes = wasLiked ? (localVideo.likes || 0) - 1 : (localVideo.likes || 0) + 1;

    setLocalVideo(prev => ({ ...prev, likes: newLikes, userLiked: !wasLiked }));

    try {
      await likeVideo(video._id);
    } catch (err) {
      setLocalVideo(prev => ({
        ...prev,
        likes: wasLiked ? newLikes + 1 : newLikes - 1,
        userLiked: wasLiked,
      }));
    } finally {
      setTimeout(() => setIsLiking(false), 300);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || isCommenting) return;
    setIsCommenting(true);
    
    try {
      await commentVideo(video._id, newComment);
      setNewComment("");
    } catch (err) {
      console.error("Erreur commentaire:", err);
    } finally {
      setIsCommenting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title || "Vidéo",
          url: window.location.href,
        });
      } catch (err) {
        console.log("Partage annulé");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Lien copié !");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Supprimer cette vidéo définitivement ?")) return;
    
    try {
      await deleteVideo(video._id);
      setShowOptions(false);
    } catch (err) {
      console.error("Erreur suppression:", err);
      alert("Erreur lors de la suppression");
    }
  };

  const handleReport = () => {
    // TODO: Implémenter système de signalement
    alert("Vidéo signalée. Nous examinerons ce contenu.");
    setShowOptions(false);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num?.toString() || "0";
  };

  return (
    <>
      {/* Actions principales (à droite) */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-5 z-40">
        {/* Like */}
        <motion.button
          onClick={handleLike}
          whileTap={{ scale: 0.9 }}
          disabled={isLiking}
          className="flex flex-col items-center gap-1"
        >
          <motion.div
            animate={localVideo.userLiked ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all ${
              localVideo.userLiked
                ? "bg-gradient-to-br from-red-500 to-pink-600"
                : "bg-black/60 backdrop-blur-md hover:bg-black/80"
            }`}
          >
            {localVideo.userLiked ? (
              <FaHeart className="text-white text-xl" />
            ) : (
              <FaRegHeart className="text-white text-xl" />
            )}
          </motion.div>
          <span className="text-white text-xs font-bold drop-shadow-lg">
            {formatNumber(localVideo.likes || 0)}
          </span>
        </motion.button>

        {/* Comment */}
        <motion.button
          onClick={() => setShowComments(!showComments)}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/80 transition-all shadow-xl">
            <FaComment className="text-white text-xl" />
          </div>
          <span className="text-white text-xs font-bold drop-shadow-lg">
            {formatNumber(localVideo.comments?.length || 0)}
          </span>
        </motion.button>

        {/* Share */}
        <motion.button
          onClick={handleShare}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/80 transition-all shadow-xl">
            <FaShare className="text-white text-xl" />
          </div>
        </motion.button>

        {/* Options */}
        <motion.button
          onClick={() => setShowOptions(!showOptions)}
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/80 transition-all shadow-xl"
        >
          <HiDotsVertical className="text-white text-xl" />
        </motion.button>
      </div>

      {/* Panel commentaires */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900/95 to-gray-900/90 backdrop-blur-xl z-50 rounded-t-3xl max-h-[70vh] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-700/50">
              <div className="flex items-center gap-2">
                <FaComment className="text-orange-500" />
                <h3 className="text-white font-bold text-lg">
                  {localVideo.comments?.length || 0} commentaire{(localVideo.comments?.length || 0) > 1 ? "s" : ""}
                </h3>
              </div>
              <motion.button
                onClick={() => setShowComments(false)}
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 transition"
              >
                ✕
              </motion.button>
            </div>

            {/* Liste commentaires */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!localVideo.comments || localVideo.comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <FaComment className="text-5xl mb-4 opacity-30" />
                  <p className="text-center">Aucun commentaire pour le moment</p>
                  <p className="text-sm text-center mt-1">Soyez le premier à commenter !</p>
                </div>
              ) : (
                localVideo.comments.map((comment, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex gap-3"
                  >
                    <img
                      src={comment.user?.profilePicture || comment.user?.avatar || "/default-avatar.png"}
                      alt={comment.user?.username || "User"}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-gray-700"
                    />
                    <div className="flex-1 bg-gray-800/50 rounded-2xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold text-sm">
                          {comment.user?.username || comment.user?.fullName || "Utilisateur"}
                        </span>
                        {comment.user?.isVerified && (
                          <span className="text-blue-400 text-xs">✓</span>
                        )}
                        <span className="text-gray-500 text-xs ml-auto">
                          {new Date(comment.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short"
                          })}
                        </span>
                      </div>
                      <p className="text-gray-200 text-sm leading-relaxed">{comment.text || comment.content}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Input commentaire */}
            <div className="p-4 border-t border-gray-700/50 bg-gray-800/80 backdrop-blur-sm">
              <div className="flex gap-3 items-center">
                <img
                  src={currentUser?.profilePicture || currentUser?.avatar || "/default-avatar.png"}
                  alt="You"
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-gray-700"
                />
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleComment()}
                    placeholder="Ajouter un commentaire..."
                    disabled={isCommenting}
                    className="flex-1 bg-gray-700/70 text-white px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-400 disabled:opacity-50 transition"
                  />
                  <motion.button
                    onClick={handleComment}
                    whileTap={{ scale: 0.95 }}
                    disabled={!newComment.trim() || isCommenting}
                    className="w-12 h-12 bg-gradient-to-r from-orange-500 to-pink-600 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
                  >
                    {isCommenting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <IoSend className="text-white text-xl" />
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal options */}
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
                {/* Header */}
                <div className="p-6 border-b border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                      <HiDotsVertical className="text-orange-500" />
                    </div>
                    <h3 className="text-white font-bold text-lg">Options</h3>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-2">
                  {/* Copier lien */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert("Lien copié !");
                      setShowOptions(false);
                    }}
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

                  {/* Sauvegarder */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      alert("Vidéo sauvegardée !");
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left hover:bg-gray-700/50 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center group-hover:bg-yellow-500/30 transition">
                      <FaBookmark className="text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Sauvegarder</p>
                      <p className="text-gray-400 text-sm">Ajouter aux favoris</p>
                    </div>
                  </motion.button>

                  {/* Signaler */}
                  {currentUser?.id !== video.uploadedBy?._id && (
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

                  {/* Supprimer (propriétaire uniquement) */}
                  {currentUser?.id === video.uploadedBy?._id && (
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

                {/* Bouton annuler */}
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
    </>
  );
};

export default VideoActions;