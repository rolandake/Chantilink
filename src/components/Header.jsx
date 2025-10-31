// src/components/Header.jsx - VERSION ULTRA FUTURISTE SANS BOUTON ACCUEIL
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Compass, Bell, User, Shield, LogOut, X, Check } from "lucide-react";
import axios from "axios";

export default function Header() {
  const { user, logout, activeUserId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [expandedNotif, setExpandedNotif] = useState(null);

  const getProfilePhotoUrl = () => {
    if (!user?.profilePhoto) return "/images/default-profile.png";
    const photo = user.profilePhoto;
    if (photo.startsWith("http")) return photo;
    if (photo.startsWith("blob:")) return photo;
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    return `${apiUrl}${photo}`;
  };

  useEffect(() => {
    if (user?.notifications) {
      const userNotifications = user.notifications || [];
      setNotifications(userNotifications);
      setUnreadCount(userNotifications.filter(n => !n.read).length);
    }
  }, [user?.notifications, user?._id]);

  useEffect(() => {
    if (!user?._id) return;

    const fetchNotifications = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await axios.get(`${API_URL}/api/users/${user._id}`, {
          withCredentials: true,
        });
        
        if (res.data?.user?.notifications) {
          const userNotifications = res.data.user.notifications;
          setNotifications(userNotifications);
          setUnreadCount(userNotifications.filter(n => !n.read).length);
        }
      } catch (err) {
        console.error("❌ Erreur chargement notifications:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?._id]);

  const markAllAsRead = async () => {
    if (!user?._id) return;

    setLoadingNotifications(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      
      const res = await axios.patch(
        `${API_URL}/api/users/${user._id}/notifications/read-all`,
        {},
        { withCredentials: true }
      );

      if (res.data?.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("❌ Erreur marquage notifications:", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!user?._id) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      
      const res = await axios.delete(
        `${API_URL}/api/users/${user._id}/notifications/${notificationId}`,
        { withCredentials: true }
      );

      if (res.data?.success) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("❌ Erreur suppression notification:", err);
    }
  };

  const toggleNotification = (notifId) => {
    setExpandedNotif(expandedNotif === notifId ? null : notifId);
  };

  const handleLogout = () => {
    logout(activeUserId);
    setShowDropdown(false);
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-gray-200/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo avec animation */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              className="relative w-12 h-12 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg overflow-hidden"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              />
              <span className="relative z-10">C</span>
            </motion.div>
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent hidden md:block">
              Chantilink
            </span>
          </Link>

          {/* Navigation */}
          {user && (
            <nav className="flex items-center gap-2 sm:gap-4">
              {/* Bouton Explorer */}
              <Link to="/explore">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative px-4 sm:px-6 py-2.5 rounded-xl font-medium transition-all ${
                    isActive("/explore")
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Compass size={20} />
                    <span className="hidden sm:inline">Explorer</span>
                  </span>
                </motion.div>
              </Link>

              {/* Notifications */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  <Bell size={20} className="text-gray-700" />
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>

                {/* Dropdown Notifications */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200/50 max-h-[32rem] overflow-hidden z-50 backdrop-blur-xl"
                    >
                      <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-4 flex items-center justify-between z-10">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                          <Bell size={20} />
                          Notifications
                        </h3>
                        {notifications.length > 0 && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={markAllAsRead}
                            disabled={loadingNotifications}
                            className="text-xs text-white/90 hover:text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition disabled:opacity-50 backdrop-blur-sm flex items-center gap-1"
                          >
                            <Check size={14} />
                            {loadingNotifications ? "..." : "Tout marquer"}
                          </motion.button>
                        )}
                      </div>

                      <div className="max-h-[28rem] overflow-y-auto divide-y divide-gray-100">
                        {notifications.length > 0 ? (
                          notifications.map((notif) => {
                            const isExpanded = expandedNotif === notif._id;
                            const message = notif.message || notif.text || "";
                            const isTruncated = message.length > 100;

                            return (
                              <motion.div
                                key={notif._id || notif.createdAt}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`p-4 hover:bg-gray-50 transition cursor-pointer ${
                                  !notif.read ? "bg-orange-50/50 border-l-4 border-orange-500" : ""
                                }`}
                                onClick={() => toggleNotification(notif._id)}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                      {!notif.read && (
                                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                      )}
                                      {notif.title}
                                    </p>
                                    <p className={`text-xs text-gray-600 mt-1.5 ${
                                      !isExpanded && isTruncated ? "line-clamp-2" : ""
                                    }`}>
                                      {message}
                                    </p>
                                    {isTruncated && (
                                      <button className="text-xs text-orange-600 hover:text-orange-700 mt-1 font-medium flex items-center gap-1">
                                        {isExpanded ? "Voir moins" : "Voir plus"}
                                        <motion.span
                                          animate={{ rotate: isExpanded ? 180 : 0 }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          ▼
                                        </motion.span>
                                      </button>
                                    )}
                                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                      <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                                      {new Date(notif.createdAt).toLocaleString("fr-FR", {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  </div>
                                  <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(notif._id);
                                    }}
                                    className="text-gray-400 hover:text-red-500 transition p-1 rounded-lg hover:bg-red-50"
                                  >
                                    <X size={18} />
                                  </motion.button>
                                </div>
                              </motion.div>
                            );
                          })
                        ) : (
                          <div className="p-12 text-center text-gray-500">
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                            >
                              <Bell size={48} className="mx-auto text-gray-300 mb-3" />
                              <p className="font-medium">Aucune notification</p>
                              <p className="text-xs mt-1">Vous êtes à jour !</p>
                            </motion.div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profil utilisateur */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-3 px-2 sm:px-3 py-2 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 transition-all shadow-md"
                >
                  <div className="relative">
                    <img
                      src={getProfilePhotoUrl()}
                      alt="Profile"
                      className="w-9 h-9 rounded-xl object-cover border-2 border-orange-500 shadow-lg"
                      onError={(e) => { e.target.src = "/images/default-profile.png"; }}
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  </div>
                  <span className="hidden lg:inline font-semibold text-gray-800 text-sm">
                    {user.fullName || user.email?.split("@")[0]}
                  </span>
                  <motion.span
                    animate={{ rotate: showDropdown ? 180 : 0 }}
                    className="text-gray-600 text-sm hidden sm:inline"
                  >
                    ▼
                  </motion.span>
                </motion.button>

                {/* Dropdown Profil */}
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-200/50 py-2 z-50 overflow-hidden backdrop-blur-xl"
                    >
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-orange-50 transition-all group"
                        onClick={() => setShowDropdown(false)}
                      >
                        <User size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Mon Profil</span>
                      </Link>

                      {user.role === "admin" && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-3 px-5 py-3 text-purple-600 font-semibold hover:bg-purple-50 transition-all group"
                          onClick={() => setShowDropdown(false)}
                        >
                          <Shield size={20} className="group-hover:scale-110 transition-transform" />
                          <span>Admin Panel</span>
                        </Link>
                      )}

                      <hr className="my-2 border-gray-200" />

                      <motion.button
                        whileHover={{ backgroundColor: "rgba(254, 226, 226, 1)" }}
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-5 py-3 text-red-600 hover:bg-red-50 transition-all group"
                      >
                        <LogOut size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Déconnexion</span>
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>
          )}

          {/* Boutons Connexion/Inscription */}
          {!user && (
            <div className="flex gap-3">
              <Link to="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-2.5 text-orange-600 font-semibold hover:bg-orange-50 rounded-xl transition-all border-2 border-orange-200"
                >
                  Connexion
                </motion.button>
              </Link>
              <Link to="/register">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all"
                >
                  S'inscrire
                </motion.button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Overlay pour fermer les dropdowns */}
      <AnimatePresence>
        {(showDropdown || showNotifications) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm"
            onClick={() => {
              setShowDropdown(false);
              setShowNotifications(false);
            }}
          />
        )}
      </AnimatePresence>
    </header>
  );
}
