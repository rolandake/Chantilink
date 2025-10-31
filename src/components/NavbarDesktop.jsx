import React from 'react';
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

const menuItems = [
  { id: "home", label: "Accueil", to: "/", icon: <FaHome /> },
  { id: "chat", label: "Assistant GPT", to: "/chat", icon: <FaComments /> },
  { id: "history", label: "Historique", to: "/history", icon: <FaHistory /> },
  { id: "calculs", label: "Calculs", to: "/calculs", icon: <FaCalculator /> },
  { id: "vision", label: "Vision IA", to: "/vision", icon: <FaEye /> },
  { id: "messages", label: "Messages", to: "/messages", icon: <FaEnvelope /> },
  { id: "users", label: "Utilisateurs", to: "/users", icon: <FaUsers /> },
  { id: "profile", label: "Profil", to: "/profile", icon: <FaUser /> },
  { id: "settings", label: "Paramètres", to: "/settings", icon: <FaCog /> },
];

export default function NavbarDesktop() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <nav className="bg-orange-600/85 backdrop-blur-md text-white shadow-glass hidden md:flex justify-center items-center px-6 h-16 gap-6 rounded-b-lg">
      {menuItems.map(({ id, label, to, icon }) => (
        <NavLink
          key={id}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            isActive
              ? "underline font-semibold flex items-center gap-1"
              : "hover:underline flex items-center gap-1"
          }
        >
          {icon && <span>{icon}</span>}
          <span>{label}</span>
        </NavLink>
      ))}

      <button
        type="button"
        onClick={handleLogout}
        className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm"
      >
        Déconnexion
      </button>
    </nav>
  );
}

