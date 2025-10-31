// src/context/AuthContext.jsx - VERSION COMPLÈTE CORRIGÉE
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import axiosClient, { injectAuthHandlers } from "../api/axiosClientGlobal";
import { idbSet, idbGet } from "../utils/idbMigration";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CONFIG = {
  TOKEN_REFRESH_MARGIN_MS: 2 * 60 * 1000,
  SESSION_TIMEOUT_MS: 7 * 24 * 60 * 60 * 1000, // 7 jours
  MAX_STORED_USERS: 10,
  NOTIFICATIONS_MAX: 50,
  AUTO_REFRESH_INTERVAL_MS: 30 * 1000,
  DEV_MODE: import.meta.env.MODE === 'development',
  VERBOSE_LOGS: false,
};

const STORAGE_KEYS = {
  USERS: "chantilink_users_enc_v5",
  ACTIVE_USER: "chantilink_active_user_v5",
};

const secureSetItem = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const secureGetItem = (key) => {
  const val = localStorage.getItem(key);
  return val ? JSON.parse(val) : null;
};

// ✅ Helper pour logs conditionnels
const devLog = (message, ...args) => {
  if (CONFIG.DEV_MODE && CONFIG.VERBOSE_LOGS) {
    console.log(message, ...args);
  }
};

const devLogImportant = (message, ...args) => {
  if (CONFIG.DEV_MODE) {
    console.log(message, ...args);
  }
};

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(new Map());
  const [activeUserId, setActiveUserId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // ================== NOTIFICATIONS ==================
  const addNotification = useCallback((type, message) => {
    setNotifications((prev) => [
      ...prev.slice(-CONFIG.NOTIFICATIONS_MAX + 1),
      { id: Date.now() + Math.random(), type, message, time: Date.now() },
    ]);
    devLogImportant("🔔 Notification:", type, message);
  }, []);

  // ================== STOCKAGE ==================
  const persistUsers = useCallback(
    (updatedUsers = users) => {
      const arr = Array.from(updatedUsers.entries())
        .map(([id, data]) => [
          id,
          {
            user: data.user,
            token: data.token,
            expiresAt: data.expiresAt,
            lastActive: data.lastActive || Date.now(),
          },
        ])
        .sort((a, b) => b[1].lastActive - a[1].lastActive)
        .slice(0, CONFIG.MAX_STORED_USERS);

      secureSetItem(STORAGE_KEYS.USERS, Object.fromEntries(arr));
      if (activeUserId) secureSetItem(STORAGE_KEYS.ACTIVE_USER, activeUserId);
      else localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);

      if (CONFIG.DEV_MODE && CONFIG.VERBOSE_LOGS) {
        console.table(arr.map(([id, u]) => ({ id, email: u.user.email, role: u.user.role, expiresAt: new Date(u.expiresAt).toLocaleTimeString() })));
        console.log("💾 Users persisted, activeUserId:", activeUserId);
      }
    },
    [users, activeUserId]
  );

  // ================== VÉRIFICATION TOKEN ==================
  const verifyStoredToken = useCallback(async (userId, token) => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
        validateStatus: () => true,
      });

      if (res.status === 200 && res.data.valid) {
        devLogImportant("✅ Token valide pour:", res.data.user.email);
        return { valid: true, user: res.data.user };
      }
      
      devLogImportant("❌ Token invalide pour:", userId);
      return { valid: false };
    } catch (err) {
      console.error("❌ Erreur vérification token:", err);
      return { valid: false };
    }
  }, []);

  const loadStoredUsers = useCallback(async () => {
    devLogImportant("📂 Chargement utilisateurs stockés");
    const storedUsers = secureGetItem(STORAGE_KEYS.USERS);
    const storedActive = secureGetItem(STORAGE_KEYS.ACTIVE_USER);

    if (storedUsers) {
      const userEntries = Object.entries(storedUsers);
      const validUsers = new Map();

      // Vérifier chaque utilisateur
      for (const [id, data] of userEntries) {
        // Vérifier si le token n'est pas expiré
        if (data.expiresAt > Date.now()) {
          const verification = await verifyStoredToken(id, data.token);
          if (verification.valid) {
            validUsers.set(id, {
              ...data,
              user: verification.user, // Mettre à jour avec les données fraîches
              socket: null
            });
          } else {
            devLogImportant("❌ Token invalide supprimé:", id);
          }
        } else {
          devLogImportant("❌ Token expiré supprimé:", id);
        }
      }

      setUsers(validUsers);
      devLogImportant("✅ Utilisateurs valides restaurés:", validUsers.size, "utilisateurs");

      // Vérifier si l'utilisateur actif est toujours valide
      if (storedActive && validUsers.has(storedActive)) {
        setActiveUserId(storedActive);
      } else if (storedActive) {
        devLogImportant("❌ Utilisateur actif non valide, déconnexion");
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
      }
    }

    setReady(true);
  }, [verifyStoredToken]);

  const getActiveUser = useCallback(() => {
    const active = activeUserId ? users.get(activeUserId) : null;
    if (CONFIG.DEV_MODE && CONFIG.VERBOSE_LOGS && Math.random() < 0.01) {
      console.log("📌 Utilisateur actif:", active?.user?.email, "Role:", active?.user?.role);
    }
    return active;
  }, [activeUserId, users]);

  const isAdmin = useCallback(() => {
    const active = getActiveUser();
    const isAdminRole = active?.user?.role === "admin";
    devLog("🔐 isAdmin():", isAdminRole, "User:", active?.user?.email);
    return isAdminRole;
  }, [getActiveUser]);

  // ================== LOGIN ==================
  const login = useCallback(
    async (email, password) => {
      devLogImportant("🚀 Tentative login", { email });
      setLoading(true);
      try {
        const res = await axios.post(`${API_URL}/api/auth/login`, { email, password }, {
          withCredentials: true,
          validateStatus: () => true,
        });
        devLogImportant("📥 Réponse login:", res.status, res.data.message);

        if (res.status >= 400) {
          addNotification("error", res.data.message || "Erreur login");
          throw new Error(res.data.message || "Erreur serveur login");
        }

        const { user, token } = res.data;
        const expiresAt = Date.now() + CONFIG.SESSION_TIMEOUT_MS; // 7 jours
        const updatedUsers = new Map(users);
        updatedUsers.set(user._id, { user, token, expiresAt, lastActive: Date.now(), socket: null });
        setUsers(updatedUsers);
        setActiveUserId(user._id);
        persistUsers(updatedUsers);
        
        // ✅ Synchroniser au cache IDB
        const userCacheKey = `user_${user._id}`;
        const userDataCacheKey = `userData_${user._id}`;
        await Promise.all([
          idbSet("users", userCacheKey, user),
          idbSet("users", userDataCacheKey, {
            _id: user._id,
            isVerified: user.isVerified,
            isPremium: user.isPremium,
            role: user.role,
            fullName: user.fullName,
            profilePhoto: user.profilePhoto,
            coverPhoto: user.coverPhoto,
            email: user.email,
            bio: user.bio,
            phone: user.phone,
            hasSeenPhoneModal: user.hasSeenPhoneModal,
            updatedAt: Date.now()
          })
        ]);
        
        const message = user.role === 'admin' ? "Connexion admin réussie 🔐" : "Connexion réussie ✅";
        addNotification("success", message);
        
        devLogImportant("🎉 Utilisateur connecté:", user.email, "Role:", user.role);
        return user;
      } catch (err) {
        console.error("❌ Login catch:", err);
        addNotification("error", err.message || "Erreur inconnue login");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [users, persistUsers, addNotification]
  );

  // ================== REGISTER ==================
  const register = useCallback(
    async (fullName, email, confirmEmail, password) => {
      if (email !== confirmEmail) {
        const msg = "Les emails ne correspondent pas";
        addNotification("error", msg);
        throw new Error(msg);
      }

      setLoading(true);
      try {
        const payload = { fullName: fullName.trim(), email: email.trim(), confirmEmail: confirmEmail.trim(), password: password.trim() };
        const res = await axios.post(`${API_URL}/api/auth/register`, payload, {
          withCredentials: true,
          validateStatus: () => true,
        });

        if (res.status >= 400) {
          addNotification("error", res.data.message || "Erreur inscription");
          throw new Error(res.data.message || "Erreur serveur register");
        }

        const { user, token } = res.data;
        const expiresAt = Date.now() + CONFIG.SESSION_TIMEOUT_MS; // 7 jours
        const updatedUsers = new Map(users);
        updatedUsers.set(user._id, { user, token, expiresAt, lastActive: Date.now(), socket: null });
        setUsers(updatedUsers);
        setActiveUserId(user._id);
        persistUsers(updatedUsers);
        
        // ✅ Synchroniser au cache IDB
        const userCacheKey = `user_${user._id}`;
        const userDataCacheKey = `userData_${user._id}`;
        await Promise.all([
          idbSet("users", userCacheKey, user),
          idbSet("users", userDataCacheKey, {
            _id: user._id,
            isVerified: user.isVerified,
            isPremium: user.isPremium,
            role: user.role,
            fullName: user.fullName,
            profilePhoto: user.profilePhoto,
            coverPhoto: user.coverPhoto,
            email: user.email,
            bio: user.bio,
            phone: user.phone,
            hasSeenPhoneModal: user.hasSeenPhoneModal,
            updatedAt: Date.now()
          })
        ]);
        
        addNotification("success", "Inscription réussie ✅");
        return user;
      } catch (err) {
        addNotification("error", err.message || "Erreur inconnue register");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [users, persistUsers, addNotification]
  );

  // ================== LOGOUT ==================
  const logout = useCallback(
    (userId) => {
      if (!userId) userId = activeUserId;
      setUsers((prev) => {
        const map = new Map(prev);
        map.delete(userId);
        return map;
      });
      if (activeUserId === userId) setActiveUserId(null);
      persistUsers();
      addNotification("info", "Déconnecté");
    },
    [activeUserId, persistUsers, addNotification]
  );

  // ================== REFRESH TOKEN ==================
  const refreshTokenForUser = useCallback(
    async (userId) => {
      const userData = users.get(userId);
      if (!userData) return false;
      
      try {
        // ✅ Utiliser /refresh-token au lieu de /refresh
        const res = await axios.post(
          `${API_URL}/api/auth/refresh-token`,
          {},
          {
            withCredentials: true,
            validateStatus: () => true,
          }
        );

        if (res.status >= 400) {
          devLogImportant("❌ Refresh failed:", res.data.message);
          addNotification("error", "Session expirée. Reconnexion requise.");
          logout(userId);
          return false;
        }

        const { token } = res.data;
        const expiresAt = Date.now() + CONFIG.SESSION_TIMEOUT_MS; // 7 jours

        setUsers((prev) => {
          const map = new Map(prev);
          const currentData = map.get(userId);
          if (currentData) {
            map.set(userId, {
              ...currentData,
              token,
              expiresAt,
              lastActive: Date.now()
            });
          }
          return map;
        });

        devLogImportant("✅ Token refreshed successfully");
        return true;
      } catch (err) {
        console.error("❌ Erreur refresh token:", err);
        addNotification("error", "Session expirée. Reconnexion requise.");
        logout(userId);
        return false;
      }
    },
    [users, logout, addNotification]
  );

  // ================== GET TOKEN ==================
  const getToken = useCallback(
    async (userId = activeUserId) => {
      const active = users.get(userId);
      if (!active) {
        devLog("⚠️ Aucun token pour userId:", userId);
        return null;
      }
      
      const timeUntilExpiry = active.expiresAt - Date.now();
      devLog("⏰ Token expire dans:", Math.floor(timeUntilExpiry / 1000 / 60), "min");
      
      if (timeUntilExpiry < CONFIG.TOKEN_REFRESH_MARGIN_MS) {
        devLogImportant("🔄 Rafraîchissement du token...");
        const refreshed = await refreshTokenForUser(userId);
        if (refreshed) {
          const updated = users.get(userId);
          return updated?.token || null;
        } else return null;
      }
      return active.token;
    },
    [users, activeUserId, refreshTokenForUser]
  );

  // ================== VERIFY ADMIN TOKEN ==================
  const verifyAdminToken = useCallback(async () => {
    if (!isAdmin()) {
      console.error("❌ Pas de rôle admin");
      return false;
    }

    const token = await getToken();
    if (!token) {
      console.error("❌ Token admin non disponible");
      addNotification("error", "Session expirée");
      return false;
    }

    devLogImportant("✅ Token admin valide");
    return token;
  }, [isAdmin, getToken, addNotification]);

  // ================== GET ALL USERS (ADMIN) ==================
  const getAllUsers = useCallback(
    async () => {
      const token = await verifyAdminToken();
      if (!token) throw new Error("Authentification admin requise");

      devLogImportant("🔐 Appel admin/users");

      const res = await axios.get(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
        validateStatus: () => true,
      });

      devLogImportant("📥 Réponse admin/users:", res.status);

      if (res.status >= 400) throw new Error(res.data.message || "Erreur serveur");

      return res.data.users || res.data || [];
    },
    [verifyAdminToken]
  );

  // ================== UPDATE USER DATA ==================
  const updateUser = useCallback(
    async (updates) => {
      const active = getActiveUser();
      if (!active) {
        console.error("❌ Aucun utilisateur actif");
        return;
      }

      const userId = active.user._id;
      devLogImportant("🔄 updateUser:", userId, updates);

      try {
        // Mise à jour du store local
        setUsers((prev) => {
          const map = new Map(prev);
          const current = map.get(userId);
          if (current) {
            map.set(userId, {
              ...current,
              user: {
                ...current.user,
                ...updates
              },
              lastActive: Date.now()
            });
          }
          return map;
        });

        // Synchroniser au cache IDB
        const userCacheKey = `user_${userId}`;
        const userDataCacheKey = `userData_${userId}`;
        
        const updatedUser = { ...active.user, ...updates };
        
        await Promise.all([
          idbSet("users", userCacheKey, updatedUser),
          idbSet("users", userDataCacheKey, {
            _id: userId,
            isVerified: updatedUser.isVerified,
            isPremium: updatedUser.isPremium,
            role: updatedUser.role,
            fullName: updatedUser.fullName,
            profilePhoto: updatedUser.profilePhoto,
            coverPhoto: updatedUser.coverPhoto,
            email: updatedUser.email,
            bio: updatedUser.bio,
            phone: updatedUser.phone,
            hasSeenPhoneModal: updatedUser.hasSeenPhoneModal,
            updatedAt: Date.now()
          })
        ]);

        // Persister dans localStorage
        persistUsers();

        devLogImportant("✅ Données utilisateur mises à jour:", userId);
        return updatedUser;

      } catch (err) {
        console.error("❌ Erreur updateUser:", err);
        throw err;
      }
    },
    [getActiveUser, persistUsers]
  );

  const updateUserData = useCallback(
    async (userId, updates) => {
      devLogImportant("🔄 updateUserData:", userId);

      try {
        // Mise à jour du store local
        setUsers((prev) => {
          const map = new Map(prev);
          const current = map.get(userId);
          if (current) {
            map.set(userId, {
              ...current,
              user: {
                ...current.user,
                ...updates
              },
              lastActive: Date.now()
            });
          }
          return map;
        });

        // Synchroniser au cache IDB
        const userCacheKey = `user_${userId}`;
        const userDataCacheKey = `userData_${userId}`;
        
        await Promise.all([
          idbSet("users", userCacheKey, { ...updates, _id: userId }),
          idbSet("users", userDataCacheKey, {
            _id: userId,
            isVerified: updates.isVerified,
            isPremium: updates.isPremium,
            role: updates.role,
            fullName: updates.fullName,
            profilePhoto: updates.profilePhoto,
            coverPhoto: updates.coverPhoto,
            email: updates.email,
            bio: updates.bio,
            phone: updates.phone,
            hasSeenPhoneModal: updates.hasSeenPhoneModal,
            updatedAt: Date.now()
          })
        ]);

        devLogImportant("✅ Données utilisateur mises à jour:", userId);
        addNotification("success", "Profil mis à jour ✅");
        return updates;

      } catch (err) {
        console.error("❌ Erreur updateUserData:", err);
        addNotification("error", "Erreur mise à jour profil");
        throw err;
      }
    },
    [addNotification]
  );

  // ================== UPDATE USER IMAGES ==================
  const updateUserImages = useCallback(
    async (userId, files) => {
      devLogImportant("🔐 updateUserImages:", userId);

      const token = await getToken(userId);
      if (!token) {
        addNotification("error", "Session expirée");
        throw new Error("Token non disponible");
      }

      try {
        const formData = new FormData();
        
        if (files.profile) {
          formData.append("profilePhoto", files.profile);
        }
        
        if (files.cover) {
          formData.append("coverPhoto", files.cover);
        }

        const res = await axios.put(
          `${API_URL}/api/users/${userId}/images`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
            withCredentials: true,
            validateStatus: () => true,
          }
        );

        devLogImportant("📥 Réponse images:", res.status);

        if (res.status >= 400) {
          addNotification("error", res.data.message || "Erreur upload images");
          throw new Error(res.data.message || "Erreur serveur");
        }

        const updatedUser = res.data.user;

        // ✅ Mise à jour du store utilisateur
        setUsers((prev) => {
          const map = new Map(prev);
          const current = map.get(userId);
          if (current) {
            map.set(userId, {
              ...current,
              user: updatedUser,
              lastActive: Date.now(),
            });
          }
          return map;
        });

        // ✅ Synchroniser au cache IDB
        const userCacheKey = `user_${userId}`;
        const userDataCacheKey = `userData_${userId}`;
        
        await Promise.all([
          idbSet("users", userCacheKey, updatedUser),
          idbSet("users", userDataCacheKey, {
            _id: updatedUser._id,
            isVerified: updatedUser.isVerified,
            isPremium: updatedUser.isPremium,
            role: updatedUser.role,
            fullName: updatedUser.fullName,
            profilePhoto: updatedUser.profilePhoto,
            coverPhoto: updatedUser.coverPhoto,
            email: updatedUser.email,
            bio: updatedUser.bio,
            phone: updatedUser.phone,
            hasSeenPhoneModal: updatedUser.hasSeenPhoneModal,
            updatedAt: Date.now()
          })
        ]);

        addNotification("success", "Images mises à jour ✅");
        devLogImportant("✅ updateUserImages succès");
        
        return updatedUser;

      } catch (err) {
        console.error("❌ updateUserImages erreur:", err);
        addNotification("error", err.message || "Erreur lors de l'upload");
        throw err;
      }
    },
    [getToken, addNotification]
  );

  // ================== SYNC USER DATA TO CACHE ==================
  useEffect(() => {
    const syncUserToCache = async () => {
      try {
        const active = getActiveUser();
        if (active?.user?._id) {
          const userCacheKey = `user_${active.user._id}`;
          const userDataCacheKey = `userData_${active.user._id}`;
          
          await Promise.all([
            idbSet("users", userCacheKey, active.user),
            idbSet("users", userDataCacheKey, {
              _id: active.user._id,
              isVerified: active.user.isVerified,
              isPremium: active.user.isPremium,
              role: active.user.role,
              fullName: active.user.fullName,
              profilePhoto: active.user.profilePhoto,
              coverPhoto: active.user.coverPhoto,
              email: active.user.email,
              bio: active.user.bio,
              phone: active.user.phone,
              hasSeenPhoneModal: active.user.hasSeenPhoneModal,
              updatedAt: Date.now()
            })
          ]);
          
          devLog("✅ Données utilisateur synchronisées au cache:", active.user._id);
        }
      } catch (err) {
        console.warn("⚠️ Erreur sync cache utilisateur:", err);
      }
    };

    syncUserToCache();
  }, [users, activeUserId, getActiveUser]);

  // ================== WATCHDOG AUTO-REFRESH ==================
  useEffect(() => {
    const interval = setInterval(() => {
      users.forEach((userData, userId) => {
        if (userData.expiresAt - Date.now() < CONFIG.TOKEN_REFRESH_MARGIN_MS) {
          refreshTokenForUser(userId);
        }
      });
    }, CONFIG.AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [users, refreshTokenForUser]);

  useEffect(() => {
    loadStoredUsers();
  }, [loadStoredUsers]);

  // ================== INJECTION HANDLERS AXIOS ==================
  useEffect(() => {
    injectAuthHandlers({
      getToken,
      logout,
      notify: (type, msg) => addNotification(type, msg),
    });
  }, [getToken, logout, addNotification]);

  // ================== CONTEXT VALUE ==================
  const value = useMemo(() => {
    const active = getActiveUser();
    return {
      users,
      activeUserId,
      user: active ? active.user : null,
      token: active ? active.token : null,
      getActiveUser,
      getToken,
      login,
      register,
      logout,
      refreshTokenForUser,
      getAllUsers,
      isAdmin,
      verifyAdminToken,
      updateUserImages,
      updateUserData,
      updateUser, // ✅ Ajout de updateUser
      loading,
      notifications,
      ready,
      DEV_MODE: CONFIG.DEV_MODE,
    };
  }, [users, activeUserId, getActiveUser, getToken, login, register, logout, refreshTokenForUser, getAllUsers, isAdmin, verifyAdminToken, updateUserImages, updateUserData, updateUser, notifications, ready, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext, CONFIG, STORAGE_KEYS };