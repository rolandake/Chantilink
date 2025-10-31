import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"

export default function Layout() {
  const { user, logout } = React.useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen">
      {/* MENU LATERAL */}
      <aside className="w-64 bg-gray-800 text-white p-4">
        <h2 className="text-xl font-bold mb-6">Assistant BTP IA</h2>
        <nav className="flex flex-col space-y-4">
          <Link to="/fil" className="hover:text-orange-400">📰 Fil d'actualité</Link>
          <Link to="/projets" className="hover:text-orange-400">📁 Projets</Link>
          <Link to="/parametres" className="hover:text-orange-400">⚙️ Paramètres</Link>
          <button onClick={handleLogout} className="text-red-400 mt-10 text-left hover:text-red-600">
            🚪 Déconnexion
          </button>
        </nav>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 p-6 bg-gray-100">
        <div className="text-right text-sm text-gray-600 mb-4">
          Connecté en tant que <strong>{user?.username}</strong>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

