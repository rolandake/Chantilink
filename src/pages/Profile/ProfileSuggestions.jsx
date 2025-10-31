import React, { useState } from "react";

const ProfileSuggestions = ({ currentUser, token, initialSuggestions = [] }) => {
  const [suggestions, setSuggestions] = useState(initialSuggestions);

  const handleFollow = async (userId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/users/${userId}/follow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Impossible de suivre l'utilisateur");
      // Supprime la suggestion suivie
      setSuggestions(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <aside className="profile-suggestions bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-4 space-y-3 border border-orange-200/30">
      <h3 className="font-semibold text-orange-500">Suggestions</h3>
      {suggestions.length === 0 ? (
        <p className="text-gray-500">Aucune suggestion pour le moment.</p>
      ) : (
        suggestions.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={s.profilePhoto} alt={s.name} className="w-10 h-10 rounded-full object-cover border border-orange-200" />
              <p className="font-medium">{s.name}</p>
            </div>
            <button
              onClick={() => handleFollow(s.id)}
              className="px-3 py-1 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition"
            >
              Suivre
            </button>
          </div>
        ))
      )}
    </aside>
  );
};

export default ProfileSuggestions;
