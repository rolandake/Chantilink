import React from 'react';
import { useState } from 'react';

import CentraleSolaire from "./CentraleSolaire.jsx";
import ReseauElectrique from "./ReseauElectrique.jsx";
import MiniHydro from "./MiniHydro.jsx";
import AuditEnergetique from "./AuditEnergetique.jsx";

const projets = [
  { key: "solaire", label: "Centrale Solaire", component: CentraleSolaire },
  { key: "reseau", label: "Réseau Électrique", component: ReseauElectrique },
  { key: "hydro", label: "Mini Barrage Hydro", component: MiniHydro },
  { key: "audit", label: "Audit Énergétique", component: AuditEnergetique },
];

const devises = ["XOF", "EUR", "USD", "CFA"];

export default function EnergieForm() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [projetActif, setProjetActif] = useState("solaire");
  const [devise, setDevise] = useState("XOF");

  const ProjetComponent = projets.find((p) => p.key === projetActif)?.component;

  return (
    <div className="relative min-h-screen bg-gray-900 text-white font-sans">
      {/* Menu burger */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-md hover:bg-gray-700 focus:outline-none"
        onClick={() => setMenuOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <svg
          className="w-7 h-7 text-orange-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Menu latéral */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="fixed top-0 left-0 h-full w-64 bg-gray-800 p-5 shadow-lg z-50 space-y-5 animate-slide-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-orange-400">Projets</h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1 rounded hover:bg-gray-700"
              >
                <svg
                  className="w-6 h-6 text-orange-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {projets.map(({ key, label }) => (
              <button
                key={key}
                className={`block w-full text-left py-2 px-3 rounded hover:bg-gray-700 ${
                  projetActif === key
                    ? "bg-gray-700 font-semibold text-orange-300"
                    : "text-gray-300"
                }`}
                onClick={() => {
                  setProjetActif(key);
                  setMenuOpen(false);
                }}
              >
                {label}
              </button>
            ))}

            <div className="mt-6">
              <label className="block text-sm text-gray-400 mb-1" htmlFor="devise-select">
                Devise :
              </label>
              <select
                id="devise-select"
                value={devise}
                onChange={(e) => setDevise(e.currentTarget.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              >
                {devises.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </aside>
        </>
      )}

      {/* Contenu principal */}
      <main className="max-w-5xl mx-auto p-6 pt-20 min-h-screen">
        <h1 className="text-3xl font-bold text-orange-400 text-center mb-6">
          ⚡ Calculs Énergétiques
        </h1>

        <div className="bg-gray-800 rounded-lg p-6 shadow-inner min-h-[400px]">
          {ProjetComponent ? (
            <ProjetComponent currency={devise} />
          ) : (
            <p className="text-center text-gray-400">Aucun projet sélectionné.</p>
          )}
        </div>
      </main>

      {/* Animation CSS */}
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
