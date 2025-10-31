// src/utils/cacheSync.js
// Utilitaire pour synchroniser les caches IndexedDB

import { 
  idbGetPosts, 
  idbSetPosts, 
  idbGetProfilePosts, 
  idbSetProfilePosts 
} from './idbMigration';

/**
 * Synchronise un nouveau post dans tous les caches pertinents
 * @param {Object} post - Le post à synchroniser
 * @param {string} userId - ID de l'utilisateur qui a créé le post
 */
export const syncNewPost = async (post, userId) => {
  try {
    console.log("🔄 Synchronisation nouveau post:", post._id);

    // 1. Mettre à jour le cache global
    const allPosts = await idbGetPosts("allPosts") || [];
    const updatedAllPosts = [post, ...allPosts.filter(p => p._id !== post._id)];
    await idbSetPosts("allPosts", updatedAllPosts);
    console.log("✅ Cache global mis à jour");

    // 2. Mettre à jour le cache profil de l'utilisateur
    if (userId) {
      const userPosts = await idbGetProfilePosts(`profilePosts_${userId}`) || [];
      const updatedUserPosts = [post, ...userPosts.filter(p => p._id !== post._id)];
      await idbSetProfilePosts(`profilePosts_${userId}`, updatedUserPosts);
      console.log("✅ Cache profil mis à jour");
    }

    return true;
  } catch (err) {
    console.error("❌ Erreur syncNewPost:", err);
    return false;
  }
};

/**
 * Supprime un post de tous les caches
 * @param {string} postId - ID du post à supprimer
 * @param {string} userId - ID de l'utilisateur (optionnel)
 */
export const syncDeletePost = async (postId, userId) => {
  try {
    console.log("🔄 Synchronisation suppression post:", postId);

    // 1. Mettre à jour le cache global
    const allPosts = await idbGetPosts("allPosts") || [];
    const updatedAllPosts = allPosts.filter(p => p._id !== postId);
    await idbSetPosts("allPosts", updatedAllPosts);
    console.log("✅ Cache global nettoyé");

    // 2. Mettre à jour le cache profil si userId fourni
    if (userId) {
      const userPosts = await idbGetProfilePosts(`profilePosts_${userId}`) || [];
      const updatedUserPosts = userPosts.filter(p => p._id !== postId);
      await idbSetProfilePosts(`profilePosts_${userId}`, updatedUserPosts);
      console.log("✅ Cache profil nettoyé");
    }

    return true;
  } catch (err) {
    console.error("❌ Erreur syncDeletePost:", err);
    return false;
  }
};

/**
 * Met à jour un post dans tous les caches
 * @param {Object} updatedPost - Le post mis à jour
 * @param {string} userId - ID de l'utilisateur (optionnel)
 */
export const syncUpdatePost = async (updatedPost, userId) => {
  try {
    console.log("🔄 Synchronisation mise à jour post:", updatedPost._id);

    // 1. Mettre à jour le cache global
    const allPosts = await idbGetPosts("allPosts") || [];
    const updatedAllPosts = allPosts.map(p => 
      p._id === updatedPost._id ? updatedPost : p
    );
    await idbSetPosts("allPosts", updatedAllPosts);
    console.log("✅ Cache global mis à jour");

    // 2. Mettre à jour le cache profil si userId fourni
    if (userId) {
      const userPosts = await idbGetProfilePosts(`profilePosts_${userId}`) || [];
      const updatedUserPosts = userPosts.map(p => 
        p._id === updatedPost._id ? updatedPost : p
      );
      await idbSetProfilePosts(`profilePosts_${userId}`, updatedUserPosts);
      console.log("✅ Cache profil mis à jour");
    }

    return true;
  } catch (err) {
    console.error("❌ Erreur syncUpdatePost:", err);
    return false;
  }
};

/**
 * Synchronise tous les posts d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {Array} userPosts - Posts de l'utilisateur
 */
export const syncUserPosts = async (userId, userPosts) => {
  try {
    console.log("🔄 Synchronisation complète profil:", userId);

    // 1. Sauvegarder dans le cache profil
    await idbSetProfilePosts(`profilePosts_${userId}`, userPosts);

    // 2. Merger dans le cache global
    const allPosts = await idbGetPosts("allPosts") || [];
    const otherPosts = allPosts.filter(p => {
      const postUserId = typeof p.user === 'object' ? p.user._id : p.user;
      return postUserId !== userId;
    });
    const merged = [...userPosts, ...otherPosts];
    await idbSetPosts("allPosts", merged);

    console.log("✅ Synchronisation complète OK");
    return true;
  } catch (err) {
    console.error("❌ Erreur syncUserPosts:", err);
    return false;
  }
};

/**
 * Récupère les posts depuis n'importe quel cache
 * @param {string} userId - ID de l'utilisateur (optionnel)
 * @returns {Array} Posts trouvés
 */
export const getCachedPosts = async (userId = null) => {
  try {
    // Essayer le cache profil d'abord si userId fourni
    if (userId) {
      const userPosts = await idbGetProfilePosts(`profilePosts_${userId}`);
      if (userPosts && userPosts.length > 0) {
        console.log("📦 Posts trouvés dans cache profil:", userPosts.length);
        return userPosts;
      }
    }

    // Sinon essayer le cache global
    const allPosts = await idbGetPosts("allPosts");
    if (allPosts && allPosts.length > 0) {
      console.log("📦 Posts trouvés dans cache global:", allPosts.length);
      
      // Filtrer par userId si fourni
      if (userId) {
        return allPosts.filter(p => {
          const postUserId = typeof p.user === 'object' ? p.user._id : p.user;
          return postUserId === userId;
        });
      }
      
      return allPosts;
    }

    console.log("📭 Aucun post en cache");
    return [];
  } catch (err) {
    console.error("❌ Erreur getCachedPosts:", err);
    return [];
  }
};