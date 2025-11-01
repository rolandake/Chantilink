import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { PlusIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useStories } from "/src/context/StoryContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import "./StoryContainer.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function StoryContainer({ onOpenStory, onOpenCreator }) {
  const { stories: storyList = [], deleteStory, loading } = useStories();
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  
  // Séparer les stories de l'utilisateur courant des autres
  const { myStories, otherUsersStories } = useMemo(() => {
    if (!storyList.length) return { myStories: [], otherUsersStories: {} };

    const my = [];
    const others = {};

    storyList.forEach((story) => {
      const ownerId = story.owner?._id || "unknown";
      const currentUserId = currentUser?.id || currentUser?._id;
      
      if (ownerId === currentUserId) {
        my.push(story);
      } else {
        if (!others[ownerId]) {
          others[ownerId] = { owner: story.owner || {}, stories: [] };
        }
        others[ownerId].stories.push(story);
      }
    });

    return { myStories: my, otherUsersStories: others };
  }, [storyList, currentUser]);

  // Préparer la liste des autres utilisateurs avec leurs stories
  const userStories = useMemo(() => {
    return Object.entries(otherUsersStories).map(([userId, data]) => {
      const allSlides = data.stories?.flatMap(s => s.slides || []) || [];
      const currentUserId = currentUser?.id || currentUser?._id;
      
      const hasUnviewed = allSlides.some(
        slide => !(slide.views || []).some(v => {
          const viewerId = typeof v === "string" ? v : v._id;
          return viewerId === currentUserId;
        })
      );

      const latestStory = data.stories?.reduce(
        (latest, story) => {
          const latestDate = new Date(latest.createdAt || 0);
          const storyDate = new Date(story.createdAt || 0);
          return storyDate > latestDate ? story : latest;
        },
        data.stories[0] || {}
      ) || {};

      return {
        userId,
        owner: data.owner || {},
        stories: data.stories || [],
        hasUnviewed,
        latestStory,
        totalSlides: allSlides.length,
      };
    }).sort((a, b) => {
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return new Date(b.latestStory.createdAt || 0) - new Date(a.latestStory.createdAt || 0);
    });
  }, [otherUsersStories, currentUser]);

  const myStoriesHaveViews = useMemo(() => {
    return myStories.some(story => 
      (story.slides || []).some(slide => (slide.views || []).length > 0)
    );
  }, [myStories]);

  // Écoute socket
  useEffect(() => {
    if (!socket) return;
    
    const handleStoryDeleted = (storyId) => {
      console.log("Story supprimée via socket:", storyId);
    };
    
    socket.on("storyDeleted", handleStoryDeleted);
    return () => socket.off("storyDeleted", handleStoryDeleted);
  }, [socket]);

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return "N/A";
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff <= 0) return "Expiré";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return hours > 0 ? `${hours}h` : `${minutes}m`;
  };

  const getMediaUrl = (mediaPath) => {
    if (!mediaPath) return "/placeholder.png";
    if (mediaPath.startsWith("http")) return mediaPath;
    if (mediaPath.startsWith("/")) return `${API_URL}${mediaPath}`;
    return `${API_URL}/${mediaPath}`;
  };

  if (loading && storyList.length === 0) {
    return (
      <div className="flex gap-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center animate-pulse">
            <div className="w-20 h-20 rounded-full bg-gray-300" />
            <div className="w-16 h-3 bg-gray-300 rounded mt-2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto p-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-gray-100">
      
      {/* === 1. Bouton Créer une story === */}
      <motion.div
        className="flex flex-col items-center cursor-pointer snap-start flex-shrink-0"
        onClick={() => onOpenCreator?.()}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-orange-400 flex items-center justify-center shadow-lg">
          {currentUser?.profilePhoto ? (
            <>
              <img
                src={getMediaUrl(currentUser.profilePhoto)}
                alt="profil"
                className="w-full h-full object-cover opacity-50"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/default-avatar.png";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center">
                <PlusIcon className="w-10 h-10 text-orange-600 drop-shadow-lg" strokeWidth={3} />
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-orange-200 flex items-center justify-center">
              <PlusIcon className="w-10 h-10 text-orange-500" />
            </div>
          )}
        </div>
        <p className="text-center text-xs mt-2 truncate w-20 font-semibold text-gray-700">Créer</p>
      </motion.div>

      {/* === 2. Ma Story === */}
      {myStories.length > 0 && (
        <motion.div
          className="cursor-pointer flex flex-col items-center snap-start flex-shrink-0 relative"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onOpenStory?.(myStories)}
        >
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 via-blue-400 to-cyan-400 p-[3px] shadow-lg">
            <div className="relative w-full h-full rounded-full overflow-hidden bg-white">
              {myStories[myStories.length - 1]?.slides?.[0]?.media && (
                <img 
                  src={getMediaUrl(myStories[myStories.length - 1].slides[0].media)} 
                  alt="Ma story" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/placeholder.png";
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute top-0 left-0 bg-blue-500 text-white text-[8px] px-1.5 py-0.5 rounded-br-lg font-bold shadow">Vous</div>
              {myStoriesHaveViews && (
                <div className="absolute bottom-0 right-0 bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded-tl-lg font-bold shadow">👁️</div>
              )}
            </div>
          </div>
          <p className="text-center text-xs mt-1 truncate w-20 font-medium text-gray-800">Ma story</p>
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <ClockIcon className="w-3 h-3" />
            <span>{getTimeRemaining(myStories[0]?.expiresAt)}</span>
          </div>
          {myStories.reduce((sum, s) => sum + (s.slides?.length || 0), 0) > 1 && (
            <span className="text-[9px] text-gray-400">
              {myStories.reduce((sum, s) => sum + (s.slides?.length || 0), 0)} slides
            </span>
          )}
        </motion.div>
      )}

      {/* === 3. Stories des autres utilisateurs === */}
      {userStories.map(({ userId, owner, stories, hasUnviewed, latestStory, totalSlides }) => {
        const lastSlide = latestStory?.slides?.at(-1);
        const timeRemaining = getTimeRemaining(latestStory?.expiresAt);

        return (
          <motion.div
            key={userId}
            className="cursor-pointer flex flex-col items-center snap-start flex-shrink-0 relative"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onOpenStory?.(stories)}
          >
            <div className={`relative w-20 h-20 rounded-full ${hasUnviewed ? "bg-gradient-to-tr from-pink-500 via-orange-400 to-yellow-400 p-[3px]" : "bg-gray-300 p-[3px]"} shadow-lg`}>
              <div className="relative w-full h-full rounded-full overflow-hidden bg-white">
                {lastSlide?.media && (
                  <img 
                    src={getMediaUrl(lastSlide.media)} 
                    alt="aperçu" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/placeholder.png";
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                {owner?.profilePhoto && (
                  <img 
                    src={getMediaUrl(owner.profilePhoto)} 
                    alt="profil" 
                    className="absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-white shadow-lg"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/default-avatar.png";
                    }}
                  />
                )}
                {hasUnviewed && (
                  <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </div>
            </div>
            <p className="text-center text-xs mt-1 truncate w-20 font-medium text-gray-800">
              {owner?.username || "Utilisateur"}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <ClockIcon className="w-3 h-3" />
              <span>{timeRemaining}</span>
            </div>
            {totalSlides > 1 && (
              <span className="text-[9px] text-gray-400">{totalSlides} slides</span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}