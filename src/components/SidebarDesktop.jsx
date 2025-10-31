// src/components/SidebarDesktop.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import {
  FaHome,
  FaComments,
  FaHistory,
  FaCalculator,
  FaEnvelope,
  FaUsers,
  FaUser,
  FaCog,
  FaEye,
} from "react-icons/fa";

export default function SidebarDesktop() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const menuItems = [
    { id: "home", label: "Accueil", to: "/", icon: <FaHome /> },
    { id: "chat", label: "Assistant GPT", to: "/chat", icon: <FaComments /> },
    { id: "history", label: "Historique", to: "/history", icon: <FaHistory /> },
    { id: "calculs", label: "Calculs", to: "/calculs", icon: <FaCalculator /> },
    { id: "vision", label: "Vision IA", to: "/vision", icon: <FaEye /> },
    { id: "messages", label: "Messages", to: "/messages", icon: <FaEnvelope /> },
    { id: "users", label: "Utilisateurs", to: "/users", icon: <FaUsers /> },
    { id: "profile", label: "Profil", to: `/profile/${user._id}`, icon: <FaUser /> },
    { id: "settings", label: "Paramètres", to: "/settings", icon: <FaCog /> },
  ];

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <aside className="hidden md:flex flex-col justify-between bg-orange-600/85 backdrop-blur-md text-white w-20 h-screen shadow-lg rounded-r-lg sticky top-0">
      <div className="flex flex-col items-center mt-4 gap-6">
        {menuItems.map(({ id, label, to, icon }) => (
          <NavLink
            key={id}
            to={to}
            end={to === "/"}
            aria-label={label}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center transition ${
                isActive ? "text-white" : "text-gray-200 hover:text-white"
              }`
            }
          >
            <span className="text-xl">{icon}</span>
            <span className="text-xs mt-1">{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="flex justify-center mb-6">
        <button
          type="button"
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-xs"
          aria-label="Déconnexion"
        >
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
