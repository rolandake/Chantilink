// src/context/StoryContext.jsx - Version avec rafraîchissement automatique
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const StoryContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function StoryProvider({ children }) {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ============================================
  // FETCH STORIES
  // ============================================
  const fetchStories = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/story`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Erreur chargement stories');
      }

      const data = await response.json();
      setStories(data.stories || []);
      console.log(`✅ ${data.stories?.length || 0} stories chargées`);
    } catch (err) {
      console.error('❌ Erreur fetch stories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ============================================
  // CREATE STORY (avec progress + refresh auto)
  // ============================================
  const createStory = useCallback(async (formData) => {
    if (!token) throw new Error('Non authentifié');

    try {
      setUploadProgress(0);

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', async () => {
          setUploadProgress(100);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            
            console.log('✅ Story créée:', data.story._id);
            
            // IMPORTANT : Rafraîchir immédiatement la liste complète
            setTimeout(() => {
              fetchStories();
              setUploadProgress(0);
            }, 500);

            resolve(data.story);
          } else {
            const error = JSON.parse(xhr.responseText);
            setUploadProgress(0);
            reject(new Error(error.error || 'Erreur upload'));
          }
        });

        xhr.addEventListener('error', () => {
          setUploadProgress(0);
          reject(new Error('Erreur réseau'));
        });

        xhr.addEventListener('abort', () => {
          setUploadProgress(0);
          reject(new Error('Upload annulé'));
        });

        xhr.open('POST', `${API_URL}/api/story`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
    } catch (err) {
      setUploadProgress(0);
      console.error('❌ Erreur création story:', err);
      throw err;
    }
  }, [token, fetchStories]);

  // ============================================
  // DELETE STORY
  // ============================================
  const deleteStory = useCallback(async (storyId) => {
    if (!token) throw new Error('Non authentifié');

    try {
      const response = await fetch(`${API_URL}/api/story/${storyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur suppression');
      }

      // Supprimer localement
      setStories(prevStories => prevStories.filter(s => s._id !== storyId));
      console.log('✅ Story supprimée localement');
      return true;
    } catch (err) {
      console.error('❌ Erreur suppression story:', err);
      throw err;
    }
  }, [token]);

  // ============================================
  // DELETE SLIDE
  // ============================================
  const deleteSlide = useCallback(async (storyId, slideIndex) => {
    if (!token) throw new Error('Non authentifié');

    try {
      const response = await fetch(`${API_URL}/api/story/${storyId}/slides/${slideIndex}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur suppression slide');
      }

      const data = await response.json();

      // Rafraîchir la liste complète
      await fetchStories();

      console.log('✅ Slide supprimée');
      return data;
    } catch (err) {
      console.error('❌ Erreur suppression slide:', err);
      throw err;
    }
  }, [token, fetchStories]);

  // ============================================
  // VIEW SLIDE (Optimisé - 1 seule fois)
  // ============================================
  const viewSlide = useCallback(async (storyId, slideIndex) => {
    if (!token || !user) return;

    try {
      // Vérifier localement si déjà vu
      const story = stories.find(s => s._id === storyId);
      if (!story?.slides?.[slideIndex]) return;

      const slide = story.slides[slideIndex];
      const userId = user.id || user._id;
      
      const alreadyViewed = slide.views?.some(
        v => (typeof v === 'string' ? v : v._id || v) === userId
      );

      if (alreadyViewed) {
        console.log('👁️ Slide déjà vue, skip API');
        return;
      }

      // Appel API
      const response = await fetch(`${API_URL}/api/story/${storyId}/slides/${slideIndex}/view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return;

      const data = await response.json();

      // Mise à jour optimiste locale
      setStories(prevStories => 
        prevStories.map(s => {
          if (s._id === storyId) {
            const updatedSlides = [...s.slides];
            if (updatedSlides[slideIndex]) {
              updatedSlides[slideIndex] = {
                ...updatedSlides[slideIndex],
                views: [...(updatedSlides[slideIndex].views || []), userId]
              };
            }
            return { ...s, slides: updatedSlides };
          }
          return s;
        })
      );

      console.log('✅ Vue enregistrée');
      return data;
    } catch (err) {
      console.error('❌ Erreur vue slide:', err);
    }
  }, [token, user, stories]);

  // ============================================
  // GET ANALYTICS
  // ============================================
  const getAnalytics = useCallback(async (storyId) => {
    if (!token) throw new Error('Non authentifié');

    try {
      const response = await fetch(`${API_URL}/api/story/${storyId}/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erreur analytics');

      const data = await response.json();
      return data.analytics;
    } catch (err) {
      console.error('❌ Erreur analytics:', err);
      throw err;
    }
  }, [token]);

  // ============================================
  // SOCKET LISTENERS
  // ============================================
  useEffect(() => {
    if (!socket) return;

    const handleNewStory = (data) => {
      console.log('🔔 Nouvelle story reçue via socket:', data.story._id);
      
      // Rafraîchir la liste complète pour être sûr
      fetchStories();
    };

    const handleStoryDeleted = (data) => {
      console.log('🗑️ Story supprimée:', data.storyId);
      setStories(prevStories => prevStories.filter(s => s._id !== data.storyId));
    };

    const handleSlideViewed = (data) => {
      console.log('👁️ Slide vue:', data);
      setStories(prevStories => 
        prevStories.map(story => {
          if (story._id === data.storyId) {
            const updatedSlides = [...story.slides];
            if (updatedSlides[data.slideIndex]) {
              const currentViews = updatedSlides[data.slideIndex].views || [];
              if (!currentViews.some(v => 
                (typeof v === 'string' ? v : v._id) === data.userId
              )) {
                updatedSlides[data.slideIndex].views = [...currentViews, data.userId];
              }
            }
            return { ...story, slides: updatedSlides };
          }
          return story;
        })
      );
    };

    socket.on('newStory', handleNewStory);
    socket.on('storyDeleted', handleStoryDeleted);
    socket.on('slideViewed', handleSlideViewed);

    return () => {
      socket.off('newStory', handleNewStory);
      socket.off('storyDeleted', handleStoryDeleted);
      socket.off('slideViewed', handleSlideViewed);
    };
  }, [socket, fetchStories]);

  // ============================================
  // INITIAL LOAD
  // ============================================
  useEffect(() => {
    if (token) {
      console.log('🔄 Chargement initial stories');
      fetchStories();
    }
  }, [token, fetchStories]);

  // ============================================
  // AUTO REFRESH (5 minutes)
  // ============================================
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      console.log('🔄 Rafraîchissement auto stories');
      fetchStories();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [token, fetchStories]);

  const value = {
    stories,
    loading,
    error,
    uploadProgress,
    fetchStories,
    createStory,
    deleteStory,
    deleteSlide,
    viewSlide,
    getAnalytics,
  };

  return (
    <StoryContext.Provider value={value}>
      {children}
    </StoryContext.Provider>
  );
}

export function useStories() {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error('useStories doit être utilisé dans un StoryProvider');
  }
  return context;
}

export default StoryContext;