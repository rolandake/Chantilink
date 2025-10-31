import React from "react";
import { NavLink } from "react-router-dom";

// Fonction de style dynamique pour NavLink
const navStyle = ({ isActive }) => ({
  display: "block",
  padding: "8px 16px",
  margin: "4px 0",
  color: isActive ? "#2563eb" : "#374151",
  fontWeight: isActive ? "bold" : "normal",
  textDecoration: "none",
  borderRadius: "4px",
  transition: "background-color 0.2s ease, color 0.2s ease",
  backgroundColor: isActive ? "#E0F2FE" : "transparent",
});

export default function Sidebar() {
  return (
    <nav className="flex flex-col p-4 bg-gray-50 border-r h-full w-56 space-y-2">
      <NavLink to="/projets" style={navStyle} aria-label="Accéder aux projets">
        📁 Projets
      </NavLink>
      <NavLink to="/chat" style={navStyle} aria-label="Accéder au chat GPT">
        💬 Chat GPT
      </NavLink>
      <NavLink to="/history" style={navStyle} aria-label="Accéder à l’historique">
        🕒 Historique
      </NavLink>
      {/* Ajoute d'autres liens ici si besoin */}
    </nav>
  );
}
