// src/pages/profile/ProfileStats.jsx - Version corrigée
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function ProfileStats({ followers = [], following = [], posts = [], stats }) {
  // ✅ Calcul des stats avec meilleure gestion des likes et views
  const calculatedStats = useMemo(() => {
    if (stats) {
      // Si stats est fourni, on ajoute likes et views si manquants
      const totalLikes = posts.reduce((sum, post) => {
        const likesCount = Array.isArray(post.likes) ? post.likes.length : (post.likes || 0);
        return sum + likesCount;
      }, 0);
      
      const totalViews = posts.reduce((sum, post) => {
        const viewsCount = Array.isArray(post.views) 
          ? post.views.length 
          : (typeof post.views === 'number' ? post.views : 0);
        return sum + viewsCount;
      }, 0);

      return {
        ...stats,
        likes: stats.likes || totalLikes,
        views: stats.views || totalViews,
      };
    }

    // Calcul complet si stats n'est pas fourni
    const totalLikes = posts.reduce((sum, post) => {
      const likesCount = Array.isArray(post.likes) ? post.likes.length : (post.likes || 0);
      return sum + likesCount;
    }, 0);
    
    const totalViews = posts.reduce((sum, post) => {
      const viewsCount = Array.isArray(post.views) 
        ? post.views.length 
        : (typeof post.views === 'number' ? post.views : 0);
      return sum + viewsCount;
    }, 0);

    return {
      followers: Array.isArray(followers) ? followers.length : 0,
      following: Array.isArray(following) ? following.length : 0,
      posts: Array.isArray(posts) ? posts.length : 0,
      likes: totalLikes,
      views: totalViews,
    };
  }, [followers, following, posts, stats]);

  // ✅ Debug logs pour vérifier les valeurs
  console.log("📊 ProfileStats Debug:", {
    postsCount: posts.length,
    totalLikes: calculatedStats.likes,
    totalViews: calculatedStats.views,
    samplePost: posts[0] ? {
      likes: posts[0].likes,
      views: posts[0].views,
    } : null
  });

  // ✅ Données pour mini-graph
  const graphData = [
    { name: "Posts", value: calculatedStats.posts },
    { name: "Abonnés", value: calculatedStats.followers },
    { name: "Abonnements", value: calculatedStats.following },
    { name: "Likes", value: calculatedStats.likes },
    { name: "Vues", value: calculatedStats.views },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-r from-orange-50 to-pink-50 p-6 rounded-3xl shadow-2xl max-w-2xl mx-auto"
    >
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">📈 Aperçu global</h2>

      {/* ✅ Cartes de stats en haut pour mieux visualiser */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {graphData.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl p-3 shadow-sm text-center"
          >
            <p className="text-2xl font-bold text-orange-600">{item.value}</p>
            <p className="text-xs text-gray-600 mt-1">{item.name}</p>
          </motion.div>
        ))}
      </div>

      {/* ✅ Graphique avec dimensions fixes */}
      <div className="bg-white rounded-2xl p-4 shadow-md" style={{ minHeight: '256px' }}>
        <ResponsiveContainer width="100%" height={256} minHeight={256}>
          <BarChart data={graphData}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: 'none', 
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Bar
              dataKey="value"
              fill="url(#colorGradient)"
              radius={[8, 8, 0, 0]}
              animationDuration={800}
            />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}