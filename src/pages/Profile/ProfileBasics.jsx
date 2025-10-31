import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const EMOJIS = ["😊", "🔥", "💡", "🎉", "🚀", "❤️", "😎", "✨", "🎶"];

// ✅ Error Boundary pour isoler les erreurs
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("❌ ProfileBasics Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center">
          <p className="text-red-700 font-medium">Une erreur est survenue</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProfileBasicsInner({ isOwner, user: propUser, showToast }) {
  const [displayData, setDisplayData] = useState({
    fullName: "",
    username: "",
    bio: "",
    location: "",
    website: ""
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    fullName: "",
    username: "",
    bio: "",
    location: "",
    website: ""
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ✅ Utiliser useRef pour éviter les re-renders
  const userIdRef = useRef(propUser?._id);

  useEffect(() => {
    userIdRef.current = propUser?._id;
  }, [propUser?._id]);

  useEffect(() => {
    if (propUser) {
      const userData = {
        fullName: propUser.fullName || "",
        username: propUser.username || "",
        bio: propUser.bio || "",
        location: propUser.location || "",
        website: propUser.website || ""
      };
      setDisplayData(userData);
      setEditData(userData);
    }
  }, [propUser]);

  const handleSave = useCallback(async () => {
    if (!propUser?._id) return;

    setError("");
    setSaving(true);
    
    try {
      const updateData = {
        fullName: editData.fullName.trim(),
        username: editData.username.trim(),
        bio: editData.bio.trim(),
        location: editData.location.trim(),
        website: editData.website.trim(),
      };

      const { data } = await axios.put(
        `${API_URL}/api/users/${propUser._id}`,
        updateData,
        { withCredentials: true }
      );

      console.log("✅ Profil mis à jour:", data);

      const newDisplayData = {
        fullName: data.fullName || "",
        username: data.username || "",
        bio: data.bio || "",
        location: data.location || "",
        website: data.website || ""
      };
      
      setDisplayData(newDisplayData);
      setEditData(newDisplayData);
      setIsEditing(false);

      if (showToast) {
        setTimeout(() => {
          showToast("Profil mis à jour ! ✅", "success");
        }, 100);
      }
    } catch (err) {
      console.error("❌ Erreur mise à jour profil:", err);
      const errorMsg = err.response?.data?.message || err.message || "Impossible de sauvegarder les modifications";
      setError(errorMsg);
      
      if (showToast) {
        showToast(errorMsg, "error");
      }
    } finally {
      setSaving(false);
    }
  }, [propUser, editData, showToast]);

  const addEmoji = useCallback((emoji) => {
    setEditData(prev => ({ ...prev, bio: prev.bio + " " + emoji }));
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setError("");
    setEditData(displayData);
  }, [displayData]);

  if (!propUser) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-6 max-w-xl mx-auto border border-gray-100">
        <div className="text-center space-y-3">
          <div className="h-6 w-40 bg-gray-300 animate-pulse rounded mx-auto" />
          <div className="h-4 w-32 bg-gray-200 animate-pulse rounded mx-auto" />
          <div className="h-4 w-64 bg-gray-200 animate-pulse rounded mx-auto mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 max-w-xl mx-auto border border-gray-100">
      {!isEditing ? (
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
            {displayData.fullName || "Sans nom"}
          </h1>
          <p className="text-gray-500 text-sm font-medium">
            @{displayData.username || "anonyme"}
          </p>
          {displayData.bio && (
            <p className="text-gray-700 text-base leading-relaxed px-4">
              {displayData.bio}
            </p>
          )}
          {displayData.location && (
            <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
              <span>📍</span> {displayData.location}
            </p>
          )}
          {displayData.website && (
            <a
              href={displayData.website.startsWith('http') ? displayData.website : `https://${displayData.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 hover:underline text-sm flex items-center justify-center gap-2 transition"
            >
              <span>🔗</span> {displayData.website}
            </a>
          )}
          {isOwner && (
            <button
              className="mt-4 px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
              onClick={() => setIsEditing(true)}
            >
              ✏️ Modifier le profil
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <label className="flex flex-col text-gray-700 font-medium">
            <span className="mb-1 text-sm">Nom complet</span>
            <input
              className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
              value={editData.fullName}
              onChange={(e) => setEditData(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder="Votre nom"
              disabled={saving}
            />
          </label>

          <label className="flex flex-col text-gray-700 font-medium">
            <span className="mb-1 text-sm">Nom d'utilisateur</span>
            <input
              className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
              value={editData.username}
              onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="@username"
              disabled={saving}
            />
          </label>

          <label className="flex flex-col text-gray-700 font-medium">
            <span className="mb-1 text-sm">Bio</span>
            <textarea
              className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none transition"
              value={editData.bio}
              onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
              rows={3}
              placeholder="Parlez-nous de vous..."
              disabled={saving}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  disabled={saving}
                  className="px-3 py-2 rounded-full hover:bg-orange-100 transition-all text-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </label>

          <label className="flex flex-col text-gray-700 font-medium">
            <span className="mb-1 text-sm">Localisation</span>
            <input
              className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
              value={editData.location}
              onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Ville, Pays"
              disabled={saving}
            />
          </label>

          <label className="flex flex-col text-gray-700 font-medium">
            <span className="mb-1 text-sm">Site web</span>
            <input
              className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
              value={editData.website}
              onChange={(e) => setEditData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://..."
              disabled={saving}
            />
          </label>

          <div className="flex justify-center gap-4 mt-6">
            <button
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {saving ? "Enregistrement..." : "💾 Enregistrer"}
            </button>
            <button
              className="px-8 py-3 bg-gray-200 text-gray-700 rounded-full font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all duration-200"
              onClick={handleCancel}
              disabled={saving}
            >
              ❌ Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfileBasics(props) {
  return (
    <ErrorBoundary>
      <ProfileBasicsInner {...props} />
    </ErrorBoundary>
  );
}