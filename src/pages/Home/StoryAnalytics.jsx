import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  EyeIcon,
  ClockIcon,
  PhotoIcon,
  UserGroupIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { useStories } from "../../context/StoryContext";

export default function StoryAnalytics({ storyId, onClose }) {
  const { getAnalytics } = useStories();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [storyId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAnalytics(storyId);
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-medium">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500 rounded-2xl p-6 max-w-md">
          <p className="text-red-400 text-center">❌ {error}</p>
          <button
            onClick={onClose}
            className="mt-4 w-full px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const timeRemaining = analytics.hoursRemaining;
  const viewRate = analytics.totalSlides > 0 
    ? ((analytics.totalViews / analytics.totalSlides) * 100).toFixed(1)
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm overflow-y-auto"
      >
        <div className="min-h-screen py-8 px-4">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center justify-between mb-6"
            >
              <h2 className="text-white text-2xl font-bold flex items-center gap-2">
                <ChartBarIcon className="w-7 h-7 text-orange-400" />
                Statistiques
              </h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition"
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </motion.button>
            </motion.div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-2xl p-4"
              >
                <PhotoIcon className="w-8 h-8 text-blue-400 mb-2" />
                <p className="text-blue-200 text-sm">Slides</p>
                <p className="text-white text-3xl font-bold">{analytics.totalSlides}</p>
              </motion.div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-2xl p-4"
              >
                <EyeIcon className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-green-200 text-sm">Vues totales</p>
                <p className="text-white text-3xl font-bold">{analytics.totalViews}</p>
              </motion.div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-2xl p-4"
              >
                <UserGroupIcon className="w-8 h-8 text-purple-400 mb-2" />
                <p className="text-purple-200 text-sm">Spectateurs</p>
                <p className="text-white text-3xl font-bold">{analytics.uniqueViewers}</p>
              </motion.div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-2xl p-4"
              >
                <ClockIcon className="w-8 h-8 text-orange-400 mb-2" />
                <p className="text-orange-200 text-sm">Temps restant</p>
                <p className="text-white text-3xl font-bold">{timeRemaining}h</p>
              </motion.div>
            </div>

            {/* Progress Bar */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-semibold">Taux de visionnage</p>
                <p className="text-orange-400 font-bold text-xl">{viewRate}%</p>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${viewRate}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"
                />
              </div>
              <p className="text-gray-400 text-sm mt-2">
                {analytics.totalViews} vues sur {analytics.totalSlides} slides possibles
              </p>
            </motion.div>

            {/* Slides Details */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-6"
            >
              <h3 className="text-white font-bold text-lg mb-4">Détails par slide</h3>
              <div className="space-y-3">
                {analytics.slidesAnalytics.map((slide, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium">Slide {index + 1}</p>
                        <p className="text-gray-400 text-sm capitalize">{slide.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-green-400">
                        <EyeIcon className="w-5 h-5" />
                        <span className="font-semibold">{slide.views}</span>
                      </div>
                      {slide.reactions > 0 && (
                        <div className="text-pink-400 font-semibold">
                          ❤️ {slide.reactions}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Timeline Info */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-white font-bold text-lg mb-4">Chronologie</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Créée le</span>
                  <span className="text-white font-medium">
                    {new Date(analytics.createdAt).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Expire le</span>
                  <span className="text-white font-medium">
                    {new Date(analytics.expiresAt).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Temps restant</span>
                  <span className="text-orange-400 font-bold">
                    {timeRemaining > 0 ? `${timeRemaining} heures` : 'Bientôt expirée'}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Close Button */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={onClose}
              className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl font-bold hover:from-orange-600 hover:to-pink-600 transition-all shadow-lg"
            >
              Fermer
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}