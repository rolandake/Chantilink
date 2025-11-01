import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import StoryContainer from "./StoryContainer";
import StoryCreator from "./StoryCreator";
import { useAuth } from "../../context/AuthContext";
import { useStories } from "../../context/StoryContext";
import { usePosts } from "../../context/PostsContext";
import StoryViewer from "./StoryViewer";
import PostCard from "./PostCard";

const toastStyles = `
@keyframes slideInRight {
  from { transform: translateX(400px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOutRight {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(400px); opacity: 0; }
}
.animate-slide-in-right { animation: slideInRight 0.3s ease-out; }
.animate-slide-out-right { animation: slideOutRight 0.3s ease-in; }
`;

if (typeof document !== 'undefined' && !document.getElementById('toast-styles')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = 'toast-styles';
  styleSheet.textContent = toastStyles;
  document.head.appendChild(styleSheet);
}

export default function Home({ onStoryModeChange, isStoryMode = false, initialStoryData }) {
  const { user: currentUser, token } = useAuth();
  const { deleteStory, createStory, fetchStories, uploadProgress } = useStories();
  
  const postsContext = usePosts();
  const { 
    posts: allPosts = [], 
    fetchNextPage, 
    hasMore = false, 
    loading = false,
    error: postsError 
  } = postsContext || {};

  const [searchQuery, setSearchQuery] = useState("");
  const [openStory, setOpenStory] = useState(initialStoryData?.openStory || null);
  const [showCreator, setShowCreator] = useState(initialStoryData?.showCreator || false);
  const [scrollY, setScrollY] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [toast, setToast] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);

  const observerRef = useRef();
  const searchTimeoutRef = useRef();
  const toastTimerRef = useRef();
  const initialLoadRef = useRef(false);

  useEffect(() => {
    const isInStoryMode = !!(openStory || showCreator);
    if (onStoryModeChange) {
      onStoryModeChange(isInStoryMode, { openStory, showCreator });
    }
  }, [openStory, showCreator, onStoryModeChange]);

  useEffect(() => {
    const loadInitialPosts = async () => {
      if (initialLoadRef.current) return;
      if (!currentUser || !token) return;
      
      initialLoadRef.current = true;
      
      if (allPosts.length > 0) {
        setInitialLoading(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      setInitialLoading(false);
    };

    loadInitialPosts();
  }, [currentUser, token, allPosts.length]);

  useEffect(() => {
    if (postsError && allPosts.length === 0 && !loading && !initialLoading) {
      setToast({ 
        message: "Mode hors ligne activé 📴", 
        type: "info" 
      });
    }
  }, [postsError, allPosts.length, loading, initialLoading]);

  useEffect(() => {
    if (toast) {
      setToastVisible(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      
      toastTimerRef.current = setTimeout(() => {
        setToastVisible(false);
        setTimeout(() => setToast(null), 300);
      }, 3000);
    }
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [toast]);

  const filteredPosts = useMemo(() => {
    if (!Array.isArray(allPosts) || allPosts.length === 0) return [];
    
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allPosts;

    return allPosts.filter((post) => {
      if (!post) return false;
      const content = post.content?.toLowerCase() || "";
      const username = post.user?.username?.toLowerCase() || "";
      const fullName = post.user?.fullName?.toLowerCase() || "";
      const name = post.user?.name?.toLowerCase() || "";
      const location = post.location?.toLowerCase() || "";

      return (
        content.includes(query) ||
        username.includes(query) ||
        fullName.includes(query) ||
        name.includes(query) ||
        location.includes(query)
      );
    });
  }, [allPosts, searchQuery]);

  const handleObserver = useCallback(
    (entries) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !loading && typeof fetchNextPage === 'function') {
        fetchNextPage().catch(err => {
          console.error("❌ Erreur fetchNextPage:", err);
        });
      }
    },
    [fetchNextPage, hasMore, loading]
  );

  useEffect(() => {
    const currentObserver = observerRef.current;
    if (!currentObserver) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.5,
      rootMargin: "200px"
    });

    observer.observe(currentObserver);

    return () => {
      if (currentObserver) observer.unobserve(currentObserver);
      observer.disconnect();
    };
  }, [handleObserver]);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const storyTranslateY = Math.min(scrollY * 0.15, 15);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim()) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(() => setIsSearching(false), 500);
    } else setIsSearching(false);
  };

  const handleSearch = useCallback(() => {
    const query = searchQuery.trim();
    if (!query) return;
  }, [searchQuery]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
  };

  const handleCloseStory = useCallback(() => {
    requestAnimationFrame(() => {
      setOpenStory(null);
    });
  }, []);

  const handleCloseCreator = useCallback(() => {
    requestAnimationFrame(() => {
      setShowCreator(false);
    });
  }, []);

  const handleOpenStory = useCallback((stories) => {
    setOpenStory(stories);
  }, []);

  const handleOpenCreator = useCallback(() => {
    setShowCreator(true);
  }, []);

  const handleCreateStory = async (formData) => {
    try {
      const newStory = await createStory(formData);
      await new Promise(resolve => setTimeout(resolve, 800));
      await fetchStories();
      
      setToast({ message: "Story créée avec succès! 🎉", type: "success" });
      
      setTimeout(() => {
        handleCloseCreator();
      }, 500);
      
    } catch (error) {
      console.error('❌ Erreur création story:', error);
      setToast({ 
        message: error.message || "Erreur lors de la création", 
        type: "error" 
      });
    }
  };

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-100 via-white to-orange-50/60 flex items-center justify-center">
        <motion.div 
          className="text-center space-y-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-lg text-gray-600 font-medium">Chargement du fil...</p>
        </motion.div>
      </div>
    );
  }

  if (isStoryMode && (openStory || showCreator)) {
    return (
      <>
        <AnimatePresence mode="wait">
          {showCreator && (
            <StoryCreator 
              key="story-creator"
              onClose={handleCloseCreator} 
              onSubmit={handleCreateStory}
              uploadProgress={uploadProgress}
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {openStory && (
            <StoryViewer
              key="story-viewer"
              stories={openStory}
              currentUser={currentUser}
              onClose={handleCloseStory}
              onDelete={deleteStory}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <div 
        className={`min-h-screen bg-gradient-to-b from-orange-100 via-white to-orange-50/60 p-4 space-y-6 relative transition-all duration-300 ${
          (showCreator || openStory) ? 'blur-sm scale-95 pointer-events-none' : ''
        }`}
      >
        {/* Barre de recherche */}
        <motion.div 
          className="sticky top-2 z-30 max-w-3xl mx-auto"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="w-full flex items-center gap-2 bg-white/80 backdrop-blur-md p-2 rounded-3xl shadow-lg border border-orange-200/50">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher un post, un utilisateur..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-transparent border-none focus:outline-none text-gray-700 placeholder-gray-400"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {searchQuery && (
              <motion.button
                onClick={clearSearch}
                className="px-3 py-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-full transition"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <XMarkIcon className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Stories */}
        {!searchQuery && (
          <motion.div
            className="relative max-w-3xl mx-auto mt-4 z-20"
            style={{ transform: `translateY(${storyTranslateY}px)` }}
          >
            <StoryContainer
              onOpenStory={handleOpenStory}
              onOpenCreator={handleOpenCreator}
            />
          </motion.div>
        )}

        {/* Feed */}
        <div className="max-w-3xl mx-auto mt-6 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post, index) => (
                <motion.div
                  key={post._id || post.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PostCard post={post} showToast={showToast} />
                </motion.div>
              ))
            ) : (
              !loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 bg-white rounded-3xl shadow-md"
                >
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-500 text-lg font-medium">Aucun post disponible</p>
                </motion.div>
              )
            )}
          </AnimatePresence>
          
          <div ref={observerRef} className="h-10 bg-transparent" />
          
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 space-y-3"
            >
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Chargement des posts...</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence mode="wait">
        {showCreator && (
          <StoryCreator 
            key="story-creator"
            onClose={handleCloseCreator} 
            onSubmit={handleCreateStory}
            uploadProgress={uploadProgress}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {openStory && (
          <StoryViewer
            key="story-viewer"
            stories={openStory}
            currentUser={currentUser}
            onClose={handleCloseStory}
            onDelete={deleteStory}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="fixed top-20 right-4 z-[10000]"
          >
            <div className={`px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] backdrop-blur-md border ${
              toast.type === "success"
                ? "bg-green-500 text-white border-green-400"
                : toast.type === "error"
                ? "bg-red-500 text-white border-red-400"
                : "bg-blue-500 text-white border-blue-400"
            }`}>
              <span className="text-2xl">
                {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
              </span>
              <p className="flex-1 font-medium">{toast.message}</p>
              <button 
                onClick={() => setToast(null)} 
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}