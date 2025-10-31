import React from 'react';
import { useState } from "react";

export default function UserList({ users, currentUserId, onFollowToggle }) {
  // users : [{ _id, username, avatar }]
  // currentUserId : id de l'utilisateur connecté
  // onFollowToggle : fonction (userId, follow: bool) => Promise

  const [loadingIds, setLoadingIds] = useState([]);

  const handleToggle = async (userId, isFollowing) => {
    setLoadingIds((ids) => [...ids, userId]);
    try {
      await onFollowToggle(userId, !isFollowing);
    } finally {
      setLoadingIds((ids) => ids.filter((id) => id !== userId));
    }
  };

  return (
    <ul className="user-list">
      {users.map((user) => {
        const isSelf = user._id === currentUserId;
        const isFollowing = user.isFollowing; // bool à définir côté parent

        return (
          <li key={user._id} className="user-item flex items-center gap-4 py-2 border-b">
            <img
              src={user.avatar || "/default-avatar.png"}
              alt={`${user.username} avatar`}
              className="w-10 h-10 rounded-full object-cover"
            />
            <span className="flex-1">{user.username}</span>

            {!isSelf && (
              <button
                onClick={() => handleToggle(user._id, isFollowing)}
                disabled={loadingIds.includes(user._id)}
                className={`px-3 py-1 rounded text-sm ${
                  isFollowing ? "bg-red-500 text-white" : "bg-green-500 text-white"
                } hover:opacity-80 transition`}
              >
                {loadingIds.includes(user._id)
                  ? "..."
                  : isFollowing
                  ? "Se désabonner"
                  : "S’abonner"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

