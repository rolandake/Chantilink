import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Fonction pour basculer l'état de la sidebar
  const toggleSidebar = () => setIsSidebarOpen((prevState) => !prevState);

  return (
    <div className="flex h-screen">
      {/* Sidebar avec classes conditionnelles pour gérer l'affichage */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Contenu principal */}
      <main className={`flex-1 overflow-auto p-6 bg-gray-100 transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-0"}`}>
        {/* Bouton pour afficher/cacher la sidebar sur mobile */}
        <button
          className="lg:hidden fixed top-4 left-4 p-2 bg-orange-500 text-white rounded-full shadow-md"
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
        >
          {isSidebarOpen ? "◁" : "▷"}
        </button>

        {/* Contenu du composant dynamique */}
        <Outlet />
      </main>
    </div>
  );
}
