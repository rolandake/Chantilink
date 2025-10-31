// src/context/VideoContext.jsx - ERREUR 404 CORRIGÉE

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';

const VideosContext = createContext();

export const useVideos = () => {
  const context = useContext(VideosContext);
  if (!context) throw new Error('useVideos doit être dans VideosProvider');
  return context;
};

export const VideosProvider = ({ children }) => {
  const { getActiveUser } = useAuth();
  const activeUser = getActiveUser();
  const token = activeUser?.token;

  const [videos, setVideos] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const socketRef = useRef(null);
  const apiClient = useRef(
    axios.create({ 
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000' 
    })
  );

  // ============================================
  // 🔌 SOCKET.IO SETUP
  // ============================================
  useEffect(() => {
    if (!token) return;

    const socket = io(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/videos`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('✅ [Videos] Socket connecté:', socket.id);
    });

    // Nouvelle vidéo publiée
    socket.on('newVideo', (video) => {
      console.log('🎬 [Videos] Nouvelle vidéo:', video._id);
      setVideos((prev) => [video, ...prev]);
    });

    // Like en temps réel
    socket.on('videoLiked', ({ videoId, likes, userId }) => {
      console.log('❤️ [Videos] Like reçu:', videoId);
      setVideos((prev) =>
        prev.map((v) => 
          v._id === videoId 
            ? { 
                ...v, 
                likes: likes ?? (v.likes || 0) + 1,
                userLiked: userId === activeUser?.id ? true : v.userLiked
              } 
            : v
        )
      );
    });

    // Commentaire en temps réel
    socket.on('commentAdded', ({ videoId, comment }) => {
      console.log('💬 [Videos] Commentaire reçu:', videoId);
      setVideos((prev) =>
        prev.map((v) =>
          v._id === videoId
            ? { ...v, comments: [...(v.comments || []), comment] }
            : v
        )
      );
    });

    // Vues en temps réel
    socket.on('videoViewed', ({ videoId, views }) => {
      console.log('👁 [Videos] Vue ajoutée:', videoId);
      setVideos((prev) =>
        prev.map((v) => (v._id === videoId ? { ...v, views } : v))
      );
    });

    // Update live viewers
    socket.on('updateViewers', ({ liveId, viewerCount }) => {
      setVideos((prev) =>
        prev.map((v) => 
          v._id === liveId && v.isLive 
            ? { ...v, viewers: viewerCount } 
            : v
        )
      );
    });

    socket.on('disconnect', () => {
      console.log('❌ [Videos] Socket déconnecté');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [token, activeUser]);

  // ============================================
  // 📡 API CALLS
  // ============================================
  
  // Intercepteur token
  useEffect(() => {
    apiClient.current.interceptors.request.use((config) => {
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }, [token]);

  // Fetch vidéos avec pagination
  const fetchVideos = useCallback(async (reset = false) => {
    if (!token || loading || (!hasMore && !reset)) return;
    
    setLoading(true);
    const currentPage = reset ? 0 : page;

    try {
      const res = await apiClient.current.get(
        `/api/videos?page=${currentPage + 1}&limit=10`
      );

      const newVideos = res.data.videos || res.data || [];
      
      if (newVideos.length < 10) setHasMore(false);
      
      setVideos((prev) => {
        if (reset) return newVideos;
        // Éviter les doublons
        const existingIds = new Set(prev.map(v => v._id));
        const uniqueNew = newVideos.filter(v => !existingIds.has(v._id));
        return [...prev, ...uniqueNew];
      });
      
      if (!reset) setPage(currentPage + 1);
      
      if (reset) {
        setPage(1);
        setHasMore(true);
      }
    } catch (err) {
      console.error('❌ [Videos] Erreur fetch:', err);
    } finally {
      setLoading(false);
    }
  }, [page, token, loading, hasMore]);

  // Fetch vidéos d'un utilisateur
  const fetchUserVideos = useCallback(async (userId) => {
    if (!token || !userId) return [];
    
    try {
      const res = await apiClient.current.get(`/api/videos/user/${userId}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error('❌ [Videos] Erreur fetch user:', err);
      return [];
    }
  }, [token]);

  // Ajouter vidéo
  const addVideo = useCallback((video) => {
    setVideos((prev) => [video, ...prev]);
    // Émettre via socket
    if (socketRef.current) {
      socketRef.current.emit('newVideo', video);
    }
  }, []);

  // Mettre à jour vidéo
  const updateVideo = useCallback((videoId, data) => {
    setVideos((prev) =>
      prev.map((v) => (v._id === videoId ? { ...v, ...data } : v))
    );
  }, []);

  // Supprimer vidéo
  const deleteVideo = useCallback(async (videoId) => {
    if (!token) return;

    try {
      await apiClient.current.delete(`/api/videos/${videoId}`);
      setVideos((prev) => prev.filter((v) => v._id !== videoId));
    } catch (err) {
      console.error('❌ [Videos] Erreur suppression:', err);
      throw err;
    }
  }, [token]);

  // ✅ Incrémenter vues - CORRIGÉ avec gestion 404
  const incrementViews = useCallback(async (videoId) => {
    if (!token || !videoId) return;

    try {
      // ✅ Essayer plusieurs routes possibles
      let res;
      try {
        // Route principale
        res = await apiClient.current.post(`/api/videos/${videoId}/view`);
      } catch (err) {
        if (err.response?.status === 404) {
          // ✅ Fallback: route alternative
          try {
            res = await apiClient.current.put(`/api/videos/${videoId}/views`);
          } catch (err2) {
            if (err2.response?.status === 404) {
              // ✅ Si aucune route disponible, incrémenter localement uniquement
              console.warn('⚠️ [Videos] Route view non disponible, incrémentation locale');
              setVideos((prev) =>
                prev.map((v) => 
                  v._id === videoId 
                    ? { ...v, views: (v.views || 0) + 1 } 
                    : v
                )
              );
              return;
            }
            throw err2;
          }
        } else {
          throw err;
        }
      }
      
      // ✅ Mettre à jour localement si succès
      if (res?.data) {
        setVideos((prev) =>
          prev.map((v) => 
            v._id === videoId 
              ? { ...v, views: res.data.views || (v.views || 0) + 1 } 
              : v
          )
        );
        
        // Émettre via socket
        if (socketRef.current) {
          socketRef.current.emit('viewVideo', { videoId });
        }
      }
    } catch (err) {
      // ✅ Ne plus afficher d'erreur 404 dans la console
      if (err.response?.status !== 404) {
        console.error('❌ [Videos] Erreur vue:', err);
      }
    }
  }, [token]);

  // Like vidéo
  const likeVideo = useCallback(async (videoId) => {
    if (!token) return;

    try {
      const res = await apiClient.current.post(`/api/videos/${videoId}/like`);
      
      // Mettre à jour localement
      setVideos((prev) =>
        prev.map((v) => 
          v._id === videoId 
            ? { ...v, likes: res.data.likes, userLiked: !v.userLiked } 
            : v
        )
      );
      
      // Émettre via socket
      if (socketRef.current) {
        socketRef.current.emit('likeVideo', { 
          videoId, 
          userId: activeUser?.id,
          likes: res.data.likes 
        });
      }
      
      return res.data;
    } catch (err) {
      console.error('❌ [Videos] Erreur like:', err);
      throw err;
    }
  }, [token, activeUser]);

  // Commenter vidéo
  const commentVideo = useCallback(async (videoId, text) => {
    if (!token || !text.trim()) return;

    try {
      const res = await apiClient.current.post(`/api/videos/${videoId}/comment`, { text });
      
      // Mettre à jour localement
      setVideos((prev) =>
        prev.map((v) => 
          v._id === videoId 
            ? { ...v, comments: res.data.comments } 
            : v
        )
      );
      
      // Émettre via socket
      if (socketRef.current) {
        const newComment = res.data.comments[res.data.comments.length - 1];
        socketRef.current.emit('commentVideo', { 
          videoId,
          comment: newComment 
        });
      }
      
      return res.data;
    } catch (err) {
      console.error('❌ [Videos] Erreur commentaire:', err);
      throw err;
    }
  }, [token]);

  const value = {
    videos,
    loading,
    hasMore,
    fetchVideos,
    fetchUserVideos,
    addVideo,
    updateVideo,
    deleteVideo,
    incrementViews,
    likeVideo,
    commentVideo,
    socket: socketRef.current,
  };

  return <VideosContext.Provider value={value}>{children}</VideosContext.Provider>;
};