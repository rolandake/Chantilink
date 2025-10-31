// src/utils/idbMigration.js
import { openDB } from "idb";

const IDB_DB_NAME = "ChantilinkCache_v1";
const IDB_VERSION = 4; // ✅ Incrémenté pour ajouter le store "users"

// Store names
export const STORES = {
  POSTS: "posts",
  PROFILE_POSTS: "profile-posts",
  STORIES: "stories",
  MESSAGES: "messages",
  USER_METADATA: "user-metadata",
  USERS: "users", // ✅ AJOUT: Store pour les données utilisateur
};

let dbInstance = null;

// ============================================
// 🔧 Initialisation IndexedDB
// ============================================
export async function initializeIndexedDB() {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await openDB(IDB_DB_NAME, IDB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`🔄 [IDB] Migration de v${oldVersion} vers v${newVersion}`);

        // Créer tous les stores nécessaires
        Object.values(STORES).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
            console.log(`✅ [IDB] Store '${storeName}' créé`);
          }
        });

        console.log("✅ [IDB] Migration terminée");
      },
      blocked() {
        console.warn("⚠️ [IDB] Ouverture bloquée, fermez les autres onglets");
      },
      blocking() {
        console.warn("⚠️ [IDB] Nouvelle version détectée");
        dbInstance?.close();
        dbInstance = null;
      },
      terminated() {
        console.error("❌ [IDB] Connexion terminée anormalement");
        dbInstance = null;
      },
    });

    console.log("✅ [IDB] Base de données initialisée");
    return dbInstance;
  } catch (err) {
    console.error("❌ [IDB] Erreur d'initialisation:", err);
    dbInstance = null;
    return null;
  }
}

// ============================================
// 📖 Fonctions génériques d'accès
// ============================================
export async function idbGet(storeName, key) {
  try {
    const db = await initializeIndexedDB();
    if (!db) return null;

    const value = await db.get(storeName, key);
    return value;
  } catch (err) {
    console.warn(`⚠️ [IDB] Erreur lecture ${storeName}:`, err);
    return null;
  }
}

export async function idbSet(storeName, key, value) {
  try {
    const db = await initializeIndexedDB();
    if (!db) return;

    // Limite la taille des caches pour éviter saturation
    if (
      (storeName === STORES.POSTS || storeName === STORES.PROFILE_POSTS) &&
      Array.isArray(value) &&
      value.length > 100
    ) {
      value = value.slice(0, 100);
    }

    await db.put(storeName, value, key);
  } catch (err) {
    console.warn(`⚠️ [IDB] Erreur écriture ${storeName}:`, err);
  }
}

export async function idbDelete(storeName, key) {
  try {
    const db = await initializeIndexedDB();
    if (!db) return;

    await db.delete(storeName, key);
  } catch (err) {
    console.warn(`⚠️ [IDB] Erreur suppression ${storeName}:`, err);
  }
}

export async function idbClear(storeName) {
  try {
    const db = await initializeIndexedDB();
    if (!db) return;

    await db.clear(storeName);
    console.log(`🧹 [IDB] Store '${storeName}' vidé`);
  } catch (err) {
    console.warn(`⚠️ [IDB] Erreur clear ${storeName}:`, err);
  }
}

export async function idbGetAllKeys(storeName) {
  try {
    const db = await initializeIndexedDB();
    if (!db) return [];

    return await db.getAllKeys(storeName);
  } catch (err) {
    console.warn(`⚠️ [IDB] Erreur getAllKeys ${storeName}:`, err);
    return [];
  }
}

// ============================================
// 🧹 Nettoyage des clés non utilisées
// ============================================
export async function idbClearOtherKeys(storeName, prefix) {
  try {
    const db = await initializeIndexedDB();
    if (!db) return;

    const keys = await db.getAllKeys(storeName);
    let deletedCount = 0;

    for (const key of keys) {
      if (!key.startsWith(prefix)) {
        await db.delete(storeName, key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 [IDB] ${deletedCount} clés supprimées de '${storeName}'`);
    }
  } catch (err) {
    console.warn(`⚠️ [IDB] Erreur clearOtherKeys ${storeName}:`, err);
  }
}

// ============================================
// 📝 Fonctions spécifiques pour les posts du feed
// ============================================
export async function idbGetPosts(key) {
  return await idbGet(STORES.POSTS, key);
}

export async function idbSetPosts(key, value) {
  return await idbSet(STORES.POSTS, key, value);
}

export async function idbClearPosts() {
  return await idbClear(STORES.POSTS);
}

// ============================================
// 👤 Fonctions spécifiques pour les posts de profil
// ============================================
export async function idbGetProfilePosts(key) {
  return await idbGet(STORES.PROFILE_POSTS, key);
}

export async function idbSetProfilePosts(key, value) {
  return await idbSet(STORES.PROFILE_POSTS, key, value);
}

export async function idbClearProfilePosts() {
  return await idbClear(STORES.PROFILE_POSTS);
}

// ============================================
// 📖 Fonctions spécifiques pour les stories
// ============================================
export async function idbGetStories(key) {
  return await idbGet(STORES.STORIES, key);
}

export async function idbSetStories(key, value) {
  return await idbSet(STORES.STORIES, key, value);
}

export async function idbClearStories() {
  return await idbClear(STORES.STORIES);
}

// ============================================
// 💬 Fonctions spécifiques pour les messages
// ============================================
export async function idbGetMessages(key) {
  return await idbGet(STORES.MESSAGES, key);
}

export async function idbSetMessages(key, value) {
  return await idbSet(STORES.MESSAGES, key, value);
}

export async function idbClearMessages() {
  return await idbClear(STORES.MESSAGES);
}

// ============================================
// 👥 Fonctions spécifiques pour les utilisateurs
// ============================================
export async function idbGetUser(key) {
  return await idbGet(STORES.USERS, key);
}

export async function idbSetUser(key, value) {
  return await idbSet(STORES.USERS, key, value);
}

export async function idbDeleteUser(key) {
  return await idbDelete(STORES.USERS, key);
}

export async function idbClearUsers() {
  return await idbClear(STORES.USERS);
}

// ============================================
// 🧹 Nettoyage intelligent des vieilles données
// ============================================
export async function cleanOldData(daysToKeep = 7) {
  try {
    const db = await initializeIndexedDB();
    if (!db) return;

    const cutoffDate = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    const stores = [STORES.POSTS, STORES.PROFILE_POSTS, STORES.STORIES, STORES.MESSAGES];

    for (const storeName of stores) {
      if (!db.objectStoreNames.contains(storeName)) continue;

      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const keys = await store.getAllKeys();

      let deletedCount = 0;

      for (const key of keys) {
        const value = await store.get(key);

        // Supprimer si timestamp trop ancien
        if (value?.timestamp && value.timestamp < cutoffDate) {
          await store.delete(key);
          deletedCount++;
        }
      }

      await tx.done;

      if (deletedCount > 0) {
        console.log(`🧹 [IDB] ${deletedCount} entrées supprimées de '${storeName}'`);
      }
    }

    console.log("✅ [IDB] Nettoyage terminé");
  } catch (err) {
    console.warn("⚠️ [IDB] Erreur nettoyage:", err);
  }
}

// ============================================
// 📊 Statistiques de stockage
// ============================================
export async function getStorageStats() {
  try {
    const db = await initializeIndexedDB();
    if (!db) return {};

    const stores = Object.values(STORES);
    const stats = {};

    for (const storeName of stores) {
      if (!db.objectStoreNames.contains(storeName)) {
        stats[storeName] = 0;
        continue;
      }

      const tx = db.transaction(storeName, "readonly");
      const count = await tx.objectStore(storeName).count();
      stats[storeName] = count;
      await tx.done;
    }

    console.table(stats);
    return stats;
  } catch (err) {
    console.error("❌ [IDB] Erreur stats:", err);
    return {};
  }
}

// ============================================
// 🗑️ Reset complet de la base
// ============================================
export async function resetIndexedDB() {
  try {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }

    await indexedDB.deleteDatabase(IDB_DB_NAME);
    console.log("✅ [IDB] Base de données supprimée");
    return true;
  } catch (err) {
    console.error("❌ [IDB] Erreur suppression:", err);
    return false;
  }
}

// ============================================
// 🔍 Health check
// ============================================
export async function healthCheck() {
  try {
    const db = await initializeIndexedDB();
    if (!db) {
      return { status: "error", error: "Impossible d'ouvrir la DB" };
    }

    const requiredStores = Object.values(STORES);
    const health = {
      status: "healthy",
      stores: {},
      issues: [],
    };

    for (const storeName of requiredStores) {
      if (!db.objectStoreNames.contains(storeName)) {
        health.status = "degraded";
        health.issues.push(`Store manquant: ${storeName}`);
        health.stores[storeName] = { exists: false };
      } else {
        const tx = db.transaction(storeName, "readonly");
        const count = await tx.objectStore(storeName).count();
        health.stores[storeName] = { exists: true, count };
        await tx.done;
      }
    }

    if (health.issues.length === 0) {
      console.log("✅ [IDB] Santé: OK");
    } else {
      console.warn("⚠️ [IDB] Problèmes détectés:", health.issues);
    }

    return health;
  } catch (err) {
    console.error("❌ [IDB] Erreur health check:", err);
    return { status: "error", error: err.message };
  }
}

// ============================================
// 🚀 Setup complet au démarrage
// ============================================
export async function setupIndexedDB() {
  console.log("🚀 [IDB] Initialisation...");

  // Initialiser
  await initializeIndexedDB();

  // Health check
  const health = await healthCheck();

  // Si erreur critique, reset
  if (health.status === "error") {
    console.warn("⚠️ [IDB] Tentative de réinitialisation...");
    await resetIndexedDB();
    await initializeIndexedDB();
  }

  // Nettoyage (30 jours)
  await cleanOldData(30);

  // Stats
  await getStorageStats();

  console.log("✅ [IDB] Prêt à l'emploi");
}

// ============================================
// 🛠️ Export pour DevTools
// ============================================
if (typeof window !== "undefined") {
  window.IDB_DEBUG = {
    init: initializeIndexedDB,
    setup: setupIndexedDB,
    clean: cleanOldData,
    stats: getStorageStats,
    reset: resetIndexedDB,
    health: healthCheck,
    get: idbGet,
    set: idbSet,
    delete: idbDelete,
    clear: idbClear,
    stores: STORES,
    // User functions
    getUser: idbGetUser,
    setUser: idbSetUser,
    deleteUser: idbDeleteUser,
    clearUsers: idbClearUsers,
  };
  console.log("💡 [IDB] Outils de debug disponibles: window.IDB_DEBUG");
}

// ============================================
// 👤 Nettoyage spécifique pour les posts de profil
// ============================================
export async function idbClearOtherKeysProfilePosts(prefix) {
  try {
    const db = await initializeIndexedDB();
    if (!db) return;

    const storeName = STORES.PROFILE_POSTS;
    const keys = await db.getAllKeys(storeName);
    let deletedCount = 0;

    for (const key of keys) {
      if (!key.startsWith(prefix)) {
        await db.delete(storeName, key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 [IDB] ${deletedCount} clés supprimées de '${storeName}' (hors '${prefix}')`);
    } else {
      console.log(`✅ [IDB] Aucun nettoyage nécessaire pour '${storeName}'`);
    }
  } catch (err) {
    console.warn("⚠️ [IDB] Erreur clearOtherKeysProfilePosts:", err);
  }
}