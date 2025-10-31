import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout } = React.useContext(AuthContext);

  const navStyle = ({ isActive }) =>
    `block px-4 py-2 rounded hover:bg-blue-100 transition ${
      isActive ? "bg-blue-200 font-semibold" : "text-gray-700"
    }`;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-white shadow-md h-full flex flex-col">
      <div className="p-4 text-center border-b font-bold text-lg text-blue-600">
        🏗️ BTP IA
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <NavLink to="/projets" style={navStyle}>
          📁 Projets
        </NavLink>
        <NavLink to="/chat" style={navStyle}>
          💬 Assistant GPT
        </NavLink>
        <NavLink to="/vision" style={navStyle}>
          🧠 Vision IA
        </NavLink>
        <NavLink to="/calculs" style={navStyle}>
          📐 Calculs
        </NavLink>
        <NavLink to="/historique" style={navStyle}>
          🕓 Historique
        </NavLink>
        <NavLink to="/mes-publications" style={navStyle}>
          📚 Mes publications
        </NavLink>
        <NavLink to="/parametres" style={navStyle}>
          ⚙️ Paramètres
        </NavLink>
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full bg-red-100 text-red-600 py-2 rounded hover:bg-red-200 font-medium"
        >
          🔓 Déconnexion
        </button>
      </div>
    </aside>
  );
}
