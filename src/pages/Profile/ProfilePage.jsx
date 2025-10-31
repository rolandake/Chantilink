// src/pages/profile/ProfilePage.jsx - VERSION COMPLÈTE CORRIGÉE
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProfileHeader from "./ProfileHeader";
import ProfileBasics from "./ProfileBasics";
import ProfileMenu from "./ProfileMenu";
import SettingsSection from "./SettingsSection";
import CreatePost from "../Home/CreatePost";
import ProfileStats from "./ProfileStats";
import PostCard from "../Home/PostCard";
import { usePosts } from "../../context/PostsContext";
import { useAuth } from "../../context/AuthContext";
import { registerServiceWorker, prefetchImagesViaSW } from "../../utils/swRegister";
import { syncNewPost, syncDeletePost, getCachedPosts } from "../../utils/cacheSync";
import axios from "axios";
import {
  setupIndexedDB,
  idbGetProfilePosts as idbGet,
  idbSetProfilePosts as idbSet,
  idbClearOtherKeysProfilePosts as idbClearOtherKeys,
} from "../../utils/idbMigration";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Normaliser les posts
const normalizePost = (p) => ({
  _id: p._id || p.id,
  content: p.content || "",
  media: Array.isArray(p.media)
    ? p.media.map((m) => ({ url: m?.url || m?.path || m?.location || m, type: m?.type || "image" }))
    : [],
  user: typeof p.user === "object" ? (p.user._id ? p.user : { _id: p.user.id }) : { _id: p.user },
  likes: p.likes || [],
  comments: p.comments || [],
  views: p.views || [],
  shares: p.shares || [],
  createdAt: p.createdAt,
});

const extractImageUrls = (posts = [], max = 30) => {
  const urls = [];
  for (const p of posts) {
    if (!p.media) continue;
    for (const m of p.media) {
      const url = m?.url || m?.path || m?.location || m;
      if (url && !urls.includes(url)) urls.push(url);
      if (urls.length >= max) break;
    }
    if (urls.length >= max) break;
  }
  return urls.slice(0, max);
};

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading, socket } = useAuth();
  const { fetchUserPosts } = usePosts();

  const [profileUser, setProfileUser] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [selectedTab, setSelectedTab] = useState("posts");
  const [toast, setToast] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [profileBasicsReady, setProfileBasicsReady] = useState(false); // ✅ Nouveau state

  const loadingRef = useRef(false);
  const saveDebounceTimer = useRef(null);
  const writeInProgress = useRef(false);
  const prefetchTimer = useRef(null);
  const observer = useRef();

  const targetUserId = userId || authUser?.id;
  const isOwner = targetUserId === authUser?.id;

  const showLocalToast = useCallback((msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchUserById = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const { data } = await axios.get(`${API_URL}/api/users/${userId}`, {
        withCredentials: true,
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      return data;
    } catch (err) {
      console.error("❌ Erreur fetchUserById:", err);
      return null;
    }
  }, []);

  const followUser = useCallback(async (userId) => {
    const { data } = await axios.post(`${API_URL}/api/users/${userId}/follow`, {}, {
      withCredentials: true
    });
    return data;
  }, []);

  const unfollowUser = useCallback(async (userId) => {
    const { data } = await axios.post(`${API_URL}/api/users/${userId}/unfollow`, {}, {
      withCredentials: true
    });
    return data;
  }, []);

  /* ---------- IndexedDB + SW ---------- */
  useEffect(() => {
    (async () => {
      try { await registerServiceWorker(); } catch {}
      try { await setupIndexedDB(); } catch {}
    })();
  }, []);

  const savePosts = useCallback((userKey, posts) => {
    if (!userKey || !Array.isArray(posts)) return;
    if (saveDebounceTimer.current) clearTimeout(saveDebounceTimer.current);
    saveDebounceTimer.current = setTimeout(async () => {
      if (writeInProgress.current) return;
      writeInProgress.current = true;
      try {
        const safePosts = posts.map(normalizePost);
        await idbSet(`profilePosts_${userKey}`, safePosts);
        console.log("💾 Posts sauvegardés:", safePosts.length);
      } finally { writeInProgress.current = false; }
    }, 400);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (prefetchTimer.current) clearTimeout(prefetchTimer.current);
    prefetchTimer.current = setTimeout(() => {
      const urls = extractImageUrls(profilePosts, 30);
      if (urls.length) prefetchImagesViaSW(urls);
    }, 600);
    return () => clearTimeout(prefetchTimer.current);
  }, [profilePosts]);

  /* ---------- Load Profile Posts avec cache sync ---------- */
  const loadProfilePosts = useCallback(async (targetId, pageNumber = 1, append = false) => {
    if (!targetId || loadingRef.current) return;
    loadingRef.current = true;
    setIsLoadingPosts(true);
    
    try {
      let postsArray = [];
      let fromCache = false;

      // ✅ 1. TOUJOURS charger depuis le cache d'abord
      const cached = await getCachedPosts(targetId);
      if (cached && cached.length > 0 && !append) {
        postsArray = cached;
        fromCache = true;
        console.log("📦 Chargement depuis cache profil:", cached.length, "posts");
        setProfilePosts(cached);
      }

      // ✅ 2. Si en ligne ET c'est la première page, mettre à jour depuis l'API
      if (navigator.onLine && pageNumber === 1) {
        try {
          console.log("🌐 Mise à jour depuis l'API...");
          const result = await fetchUserPosts(targetId, pageNumber);
          
          if (Array.isArray(result) && result.length > 0) {
            postsArray = result;
            fromCache = false;
            console.log("✅ API OK:", result.length, "posts");
          }
        } catch (err) {
          console.error("❌ Erreur API, utilisation du cache:", err);
          // ✅ Garder les posts du cache si l'API échoue
          if (!postsArray.length && cached && cached.length > 0) {
            postsArray = cached;
            fromCache = true;
          }
        }
      }

      setHasMore(postsArray.length > 0 && postsArray.length >= 20);
      
      setProfilePosts((prev) => {
        const newPosts = append ? [...prev, ...postsArray] : postsArray;
        const uniquePosts = newPosts.reduce((acc, post) => {
          if (!acc.find((p) => p._id === post._id)) acc.push(post);
          return acc;
        }, []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // ✅ Sauvegarder immédiatement si on a de nouvelles données
        if (!fromCache || append) {
          console.log("💾 Sauvegarde dans cache:", uniquePosts.length, "posts");
          savePosts(targetId, uniquePosts);
        }
        
        return uniquePosts;
      });
    } catch (err) {
      console.error("❌ Erreur loadProfilePosts:", err);
      showLocalToast("Erreur de chargement des posts", "error");
    } finally {
      loadingRef.current = false;
      setIsLoadingPosts(false);
    }
  }, [fetchUserPosts, savePosts, showLocalToast]);

  // ✅ Chargement initial du profil
  useEffect(() => {
    if (authLoading) return;
    if (!authUser) return navigate("/auth", { replace: true });
    if (!targetUserId) return setIsLoadingUser(false);

    (async () => {
      setIsLoadingUser(true);
      try {
        await idbClearOtherKeys(`profilePosts_${targetUserId}`);

        if (isOwner) {
          setProfileUser(authUser);
        } else {
          const fetchedUser = await fetchUserById(targetUserId);
          if (!fetchedUser) { 
            showLocalToast("Utilisateur introuvable", "error"); 
            navigate("/", { replace: true }); 
            return; 
          }
          setProfileUser(fetchedUser);
        }

        // ✅ Charger les posts depuis le cache d'abord
        const cached = await getCachedPosts(targetUserId);
        if (cached && cached.length > 0) {
          console.log("📦 Posts depuis cache au chargement:", cached.length);
          setProfilePosts(cached);
        }

        // ✅ Puis mettre à jour depuis l'API si en ligne
        if (navigator.onLine) {
          await loadProfilePosts(targetUserId, 1, false);
        }

        setPage(1);
        setHasMore(true);
      } catch (err) {
        console.error("❌ Erreur chargement profil:", err);
        showLocalToast("Erreur de chargement du profil", "error");
      } finally { 
        setIsLoadingUser(false); 
      }
    })();
  }, [authUser, authLoading, targetUserId, isOwner, fetchUserById, navigate, loadProfilePosts, showLocalToast]);

  /* ---------- Socket Events ---------- */
  useEffect(() => {
    if (!socket || !profileUser) return;
    
    const handleNewPost = (post) => {
      const postUserId = typeof post.user === "object" ? post.user._id : post.user;
      if (postUserId === profileUser._id) {
        setProfilePosts((prev) => {
          if (prev.find((p) => p._id === post._id)) return prev;
          const newPosts = [normalizePost(post), ...prev];
          savePosts(profileUser._id, newPosts);
          return newPosts;
        });
      }
    };
    
    const handleDeletedPost = (postId) => {
      setProfilePosts((prev) => {
        const newPosts = prev.filter((p) => p._id !== postId);
        savePosts(profileUser._id, newPosts);
        return newPosts;
      });
    };
    
    const handleUpdatedPost = (post) => {
      setProfilePosts((prev) => {
        const newPosts = prev.map((p) => (p._id === post._id ? normalizePost(post) : p));
        savePosts(profileUser._id, newPosts);
        return newPosts;
      });
    };

    socket.on("newPost", handleNewPost);
    socket.on("postDeleted", handleDeletedPost);
    socket.on("postUpdated", handleUpdatedPost);

    return () => {
      socket.off("newPost", handleNewPost);
      socket.off("postDeleted", handleDeletedPost);
      socket.off("postUpdated", handleUpdatedPost);
    };
  }, [socket, profileUser, savePosts]);

  /* ---------- Post creation / deletion avec cache sync ---------- */
  const handlePostCreated = useCallback(async (newPost) => {
    if (!newPost || !profileUser) return;
    
    console.log("✅ Nouveau post créé:", newPost._id);
    const normalized = normalizePost(newPost);
    
    // ✅ Synchroniser dans tous les caches
    await syncNewPost(normalized, profileUser._id);
    
    setProfilePosts((prev) => {
      if (prev.find((p) => p._id === newPost._id)) {
        console.log("⚠️ Post déjà présent");
        return prev;
      }
      const newPosts = [normalized, ...prev];
      return newPosts;
    });
    
    showLocalToast("Post publié ! 🚀");
  }, [profileUser, showLocalToast]);

  const handlePostDeleted = useCallback(async (postId) => {
    if (!profileUser) return;
    
    console.log("🗑️ Suppression du post:", postId);
    
    // ✅ Synchroniser dans tous les caches
    await syncDeletePost(postId, profileUser._id);
    
    setProfilePosts((prev) => {
      const newPosts = prev.filter((p) => p._id !== postId);
      return newPosts;
    });
    
    showLocalToast("Post supprimé ! 🗑️");
  }, [profileUser, showLocalToast]);

  /* ---------- Infinite Scroll ---------- */
  const lastPostRef = useCallback((node) => {
    if (loadingRef.current) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        if (profileUser?._id) loadProfilePosts(profileUser._id, nextPage, true);
      }
    });
    if (node) observer.current.observe(node);
  }, [page, hasMore, loadProfilePosts, profileUser]);

  /* ---------- Follow toggle ---------- */
  const followStatus = profileUser && authUser && !isOwner
    ? (profileUser.followers || []).some(u => (typeof u === "object" ? u._id : u) === authUser.id)
    : null;

  const handleFollowToggle = useCallback(async () => {
    if (!authUser || !profileUser || followLoading) return;
    setFollowLoading(true);
    const wasFollowing = followStatus;
    try {
      const newFollowers = wasFollowing
        ? (profileUser.followers || []).filter(u => (typeof u === "object" ? u._id : u) !== authUser.id)
        : [...(profileUser.followers || []), authUser.id];

      setProfileUser(prev => ({ ...prev, followers: newFollowers }));
      if (wasFollowing) await unfollowUser(profileUser._id);
      else await followUser(profileUser._id);
      showLocalToast(wasFollowing ? "Désabonné !" : "Abonné ! 🎉");
    } catch (err) {
      console.error("❌ Erreur follow:", err);
      showLocalToast("Erreur lors de l'action", "error");
    } finally { setFollowLoading(false); }
  }, [authUser, profileUser, followStatus, followLoading, followUser, unfollowUser, showLocalToast]);

  // ✅ Vérification du cache au montage
  useEffect(() => {
    if (!profileUser?._id) return;
    
    const verifyCache = async () => {
      try {
        const cached = await getCachedPosts(profileUser._id);
        console.log("🔍 Vérification cache profil:", cached?.length || 0, "posts");
        
        if (!cached || cached.length === 0) {
          console.log("⚠️ Cache vide, rechargement depuis l'API");
          if (navigator.onLine) {
            await loadProfilePosts(profileUser._id, 1, false);
          }
        }
      } catch (err) {
        console.error("❌ Erreur vérification cache:", err);
      }
    };
    
    verifyCache();
  }, [profileUser?._id, loadProfilePosts]);

  const stats = {
    followers: profileUser?.followers?.length || 0,
    following: profileUser?.following?.length || 0,
    posts: profilePosts.length,
  };

  if (authLoading || isLoadingUser) {
    return (
      <div className="profile-page min-h-screen bg-orange-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page min-h-screen bg-orange-50 p-4 space-y-6">
      <ProfileHeader user={profileUser || authUser} isOwner={isOwner} />

      <div className="bg-white rounded-3xl p-5 shadow-md space-y-4">
        {/* ✅ CORRIGÉ : Ajout d'une clé stable + suppression de onProfileUpdate */}
        <ProfileBasics 
          key={`profile-basics-${profileUser?._id || authUser?.id || 'loading'}`}
          user={profileUser || authUser} 
          isOwner={isOwner} 
          showToast={showLocalToast}
        />
        <ProfileStats 
          followers={profileUser?.followers || []} 
          following={profileUser?.following || []} 
          posts={profilePosts} 
          stats={stats} 
        />
      </div>

      {!isOwner && profileUser && (
        <div className="text-center">
          <button 
            onClick={handleFollowToggle} 
            disabled={followLoading}
            className={`px-8 py-3 rounded-full font-semibold transition shadow-md ${
              followStatus ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-orange-500 text-white hover:bg-orange-600"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {followLoading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                Chargement...
              </span>
            ) : followStatus ? "Se désabonner" : "S'abonner"}
          </button>
        </div>
      )}

      <ProfileMenu 
        selectedTab={selectedTab} 
        onSelectTab={setSelectedTab} 
        isOwner={isOwner} 
        stats={stats} 
      />

      {selectedTab === "posts" && (
        <div className="space-y-4">
          {isOwner && (
            <CreatePost 
              user={authUser} 
              onPostCreated={handlePostCreated} 
              showToast={showLocalToast} 
            />
          )}
          
          {isLoadingPosts && profilePosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">Chargement des posts...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {profilePosts.map((post, index) => (
                <div 
                  key={post._id} 
                  ref={index === profilePosts.length - 1 ? lastPostRef : null}
                >
                  <PostCard 
                    post={post} 
                    onDeleted={handlePostDeleted} 
                    showToast={showLocalToast} 
                  />
                </div>
              ))}
            </div>
          )}
          
          {!hasMore && profilePosts.length > 0 && (
            <div className="text-center text-gray-500 py-4">✨ Fin des posts</div>
          )}
          
          {!isLoadingPosts && profilePosts.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl">
              <p className="text-gray-500 text-lg">📭 Aucun post pour le moment</p>
              {isOwner && <p className="text-gray-400 text-sm mt-2">Créez votre premier post !</p>}
            </div>
          )}
        </div>
      )}

      {selectedTab === "settings" && isOwner && (
        <SettingsSection user={profileUser || authUser} showToast={showLocalToast} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
          <div className={`px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] ${
            toast.type === "success" ? "bg-green-500 text-white" : 
            toast.type === "error" ? "bg-red-500 text-white" : "bg-blue-500 text-white"
          }`}>
            <span className="text-2xl">
              {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
            </span>
            <p className="flex-1 font-medium">{toast.message}</p>
            <button 
              onClick={() => setToast(null)} 
              className="text-white/80 hover:text-white transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



  