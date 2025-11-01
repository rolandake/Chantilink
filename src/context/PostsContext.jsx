// src/context/PostsContext.jsx - VERSION CORRIGÉE
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { idbGetPosts, idbSetPosts } from "../utils/idbMigration";
import { syncNewPost, syncDeletePost, syncUpdatePost, syncUserPosts } from "../utils/cacheSync";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const PostsContext = createContext();
export const usePosts = () => useContext(PostsContext);

export const PostsProvider = ({ children }) => {
  const { user, token } = useAuth();
  const { addToast } = useToast();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingRef = useRef(false);
  const initialLoadDone = useRef(false);

  // Normalisation des posts
  const normalizePost = (p) => ({
    ...p,
    _id: p._id || p.id,
    user: p.user || p.author,
    likes: p.likes || [],
    comments: p.comments || [],
    views: p.views || [],
    shares: p.shares || [],
  });

  // ✅ Fetch posts (global feed)
  const fetchPosts = useCallback(async (pageNumber = 1, append = false) => {
    if (!token || isLoadingRef.current) return { success: false, posts: [] };

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/posts?page=${pageNumber}&limit=20`, {
        headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erreur ${res.status}: ${errorText}`);
      }

      const responseData = await res.json();
      console.log("📦 Réponse API posts:", responseData);

      // ✅ CORRECTION: Gérer plusieurs formats de réponse
      let postsArray = [];
      if (responseData.data && Array.isArray(responseData.data)) {
        postsArray = responseData.data;
      } else if (responseData.posts && Array.isArray(responseData.posts)) {
        postsArray = responseData.posts;
      } else if (Array.isArray(responseData)) {
        postsArray = responseData;
      }

      const normalized = postsArray.map(normalizePost);

      setPosts(prev => {
        const merged = append ? [...prev, ...normalized] : normalized;
        const unique = merged.filter((p, i, self) => i === self.findIndex(x => x._id === p._id));
        idbSetPosts("allPosts", unique);
        return unique;
      });

      const hasMorePosts = responseData.hasMore !== false && normalized.length === 20;
      setHasMore(hasMorePosts);
      setPage(pageNumber);

      return { success: true, posts: normalized };

    } catch (err) {
      console.error("❌ Erreur fetchPosts:", err);
      setError(err.message);
      setHasMore(false);
      if (pageNumber === 1) addToast(`Erreur chargement posts: ${err.message}`, "error");
      return { success: false, posts: [], error: err.message };
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [token, addToast]);

  // ✅ Fetch next page
  const fetchNextPage = useCallback(async () => {
    if (!hasMore || isLoadingRef.current || loading) {
      return { success: false, reason: 'already_loading_or_no_more' };
    }
    return await fetchPosts(page + 1, true);
  }, [hasMore, loading, page, fetchPosts]);

  // ✅ Fetch posts d'un utilisateur spécifique
  const fetchUserPosts = useCallback(async (userId, pageNumber = 1, append = false) => {
    if (!token || !userId) return [];

    try {
      const res = await fetch(`${API_URL}/api/posts?userId=${userId}&page=${pageNumber}&limit=20`, {
        headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
      });

      if (!res.ok) throw new Error(`Erreur ${res.status}`);

      const responseData = await res.json();
      
      // ✅ Gérer plusieurs formats de réponse
      let postsArray = [];
      if (responseData.data && Array.isArray(responseData.data)) {
        postsArray = responseData.data;
      } else if (responseData.posts && Array.isArray(responseData.posts)) {
        postsArray = responseData.posts;
      } else if (Array.isArray(responseData)) {
        postsArray = responseData;
      }

      const normalized = postsArray.map(normalizePost);

      // ✅ Synchroniser dans tous les caches
      await syncUserPosts(userId, normalized);

      // Merger dans le context global
      setPosts(prev => {
        const merged = append ? [...prev, ...normalized] : [...normalized, ...prev.filter(p => {
          const pUserId = typeof p.user === 'object' ? p.user._id : p.user;
          return pUserId !== userId;
        })];
        const unique = merged.filter((p, i, self) => i === self.findIndex(x => x._id === p._id));
        idbSetPosts("allPosts", unique);
        return unique;
      });

      return normalized;
    } catch (err) {
      console.error("❌ Erreur fetchUserPosts:", err);
      
      // ✅ En cas d'erreur, essayer de retourner depuis le cache
      try {
        const { getCachedPosts } = await import('../utils/cacheSync');
        const cached = await getCachedPosts(userId);
        if (cached && cached.length > 0) {
          console.log("📦 Récupération depuis le cache profil");
          return cached;
        }
      } catch {}
      
      return [];
    }
  }, [token]);

  // ✅ Create Post avec synchronisation - CORRIGÉ
  const createPost = useCallback(async (formData) => {
    if (!token) {
      addToast("Vous devez être connecté", "error");
      return null;
    }

    try {
      const res = await fetch(`${API_URL}/api/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Erreur ${res.status}`);
      }

      const responseData = await res.json();
      console.log("✅ Réponse création post:", responseData);

      // ✅ CORRECTION: Extraire le post correctement
      let newPost = null;
      if (responseData.data) {
        newPost = responseData.data;
      } else if (responseData._id) {
        newPost = responseData;
      }

      if (!newPost || !newPost._id) {
        throw new Error("Réponse invalide du serveur");
      }

      const normalized = normalizePost(newPost);
      console.log("✅ Post normalisé:", normalized);

      // ✅ Synchroniser dans tous les caches
      const userId = user?._id || user?.id;
      await syncNewPost(normalized, userId);

      setPosts(prev => {
        const updated = [normalized, ...prev];
        return updated;
      });

      addToast("Post publié ! 🚀", "success");
      return normalized;
    } catch (err) {
      console.error("❌ Erreur createPost:", err);
      setError(err.message);
      addToast(`Erreur publication: ${err.message}`, "error");
      return null;
    }
  }, [token, user, addToast]);

  // ✅ Delete Post avec synchronisation
  const deletePost = useCallback(async (postId) => {
    if (!token) return false;

    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Erreur suppression");

      // ✅ Synchroniser dans tous les caches
      const userId = user?._id || user?.id;
      await syncDeletePost(postId, userId);

      setPosts(prev => {
        const updated = prev.filter(p => p._id !== postId);
        return updated;
      });

      addToast("Post supprimé 🗑️", "success");
      return true;
    } catch (err) {
      console.error("❌ Erreur deletePost:", err);
      setError(err.message);
      addToast(`Erreur suppression: ${err.message}`, "error");
      return false;
    }
  }, [token, user, addToast]);

  // ✅ Update Post avec synchronisation
  const updatePost = useCallback(async (updatedPost) => {
    const normalized = normalizePost(updatedPost);
    
    // ✅ Synchroniser dans tous les caches
    const userId = typeof normalized.user === 'object' ? normalized.user._id : normalized.user;
    await syncUpdatePost(normalized, userId);
    
    setPosts(prev => {
      const updated = prev.map(p => 
        p._id === normalized._id ? normalized : p
      );
      return updated;
    });
  }, []);

  // ✅ Toggle Like
  const toggleLike = useCallback(async (postId) => {
    if (!token || !user) return false;

    setPosts(prev => {
      const updated = prev.map(p => {
        if (p._id === postId) {
          const likes = Array.isArray(p.likes) ? [...p.likes] : [];
          const idx = likes.findIndex(id => id === user.id || id === user._id);
          if (idx > -1) likes.splice(idx, 1);
          else likes.push(user.id || user._id);
          return { ...p, likes };
        }
        return p;
      });
      idbSetPosts("allPosts", updated);
      return updated;
    });

    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Erreur like");

      const responseData = await res.json();
      const updatedPost = responseData.data || responseData;
      const normalized = normalizePost(updatedPost);
      
      // ✅ Synchroniser
      const userId = typeof normalized.user === 'object' ? normalized.user._id : normalized.user;
      await syncUpdatePost(normalized, userId);
      
      setPosts(prev => {
        const updated = prev.map(p =>
          p._id === postId ? normalized : p
        );
        return updated;
      });

      return true;
    } catch (err) {
      console.error("❌ Erreur toggleLike:", err);
      fetchPosts(1, false);
      addToast(`Erreur like: ${err.message}`, "error");
      return false;
    }
  }, [token, user, addToast, fetchPosts]);

  // ✅ Add Comment
  const addComment = useCallback(async (postId, content) => {
    if (!content?.trim() || !token) return false;

    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error("Erreur commentaire");
      
      const responseData = await res.json();
      const newComment = responseData.data || responseData;

      setPosts(prev => {
        const updated = prev.map(p => {
          if (p._id === postId) {
            const comments = Array.isArray(p.comments) ? [...p.comments, newComment] : [newComment];
            return { ...p, comments };
          }
          return p;
        });
        idbSetPosts("allPosts", updated);
        return updated;
      });

      addToast("Commentaire ajouté ! 💬", "success");
      return true;
    } catch (err) {
      console.error("❌ Erreur addComment:", err);
      setError(err.message);
      addToast(`Erreur commentaire: ${err.message}`, "error");
      return false;
    }
  }, [token, addToast]);

  // ✅ Initial load
  useEffect(() => {
    const loadInitialPosts = async () => {
      if (!token || initialLoadDone.current) return;

      try {
        // ✅ Charger le cache d'abord
        const cached = await idbGetPosts("allPosts");
        if (cached?.length > 0) {
          console.log("📦 Chargement des posts depuis le cache:", cached.length);
          setPosts(cached);
          setError(null);
        }

        // ✅ Puis fetch depuis l'API si en ligne
        if (navigator.onLine) {
          console.log("🌐 Mise à jour depuis l'API...");
          await fetchPosts(1, false);
        } else {
          console.log("📴 Mode hors ligne - utilisation du cache uniquement");
        }

        initialLoadDone.current = true;
      } catch (err) {
        console.error("❌ Erreur loadInitialPosts:", err);
        if (!posts.length) {
          setError(err.message);
        }
      }
    };

    loadInitialPosts();
  }, [token]);

  return (
    <PostsContext.Provider value={{
      posts,
      loading,
      error,
      hasMore,
      page,
      fetchPosts,
      fetchNextPage,
      fetchUserPosts,
      createPost,
      deletePost,
      updatePost,
      toggleLike,
      addComment,
    }}>
      {children}
    </PostsContext.Provider>
  );
};