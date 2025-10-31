import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Barre latérale */}
      <Sidebar />

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* En-tête (optionnel) */}
        <header className="bg-white shadow px-4 py-3">
          <h1 className="text-xl font-semibold"><Chantilink></Chantilink></h1>
        </header>

        {/* Contenu des pages */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
