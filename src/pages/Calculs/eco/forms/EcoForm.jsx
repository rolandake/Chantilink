// src/pages/Calculs/eco/forms/EcoForm.jsx
import React, { useState } from "react";

import TerrassementEco from "./TerrassementEco.jsx";
import FondationEco from "./FondationEco.jsx";
import EnergieEco from "./EnergieEco.jsx";
import EauEco from "./EauEco.jsx";
import MateriauxEco from "./MateriauxEco.jsx";
import DechetsEco from "./DechetsEco.jsx";
import TransportEco from "./TransportEco.jsx";
import DevisEco from "./DevisEco.jsx";

export default function EcoForm({ currency = "XOF" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);

  const [totaux, setTotaux] = useState({
    terrassement: 0,
    fondation: 0,
    energie: 0,
    eau: 0,
    materiaux: 0,
    dechets: 0,
    transport: 0,
  });

  const [quantitesParOuvrage, setQuantitesParOuvrage] = useState({});

  function handleStepTotalChange(stepKey, stepTotal) {
    setTotaux((prev) => ({ ...prev, [stepKey]: stepTotal }));
  }

  function handleMaterialsChange(stepKey, materiauxStep = {}) {
    setQuantitesParOuvrage((prev) => ({
      ...prev,
      [stepKey]: materiauxStep,
    }));
  }

  const steps = [
    { key: "terrassement", label: "Terrassement", component: TerrassementEco },
    { key: "fondation", label: "Fondation", component: FondationEco },
    { key: "energie", label: "Énergie", component: EnergieEco },
    { key: "eau", label: "Eau", component: EauEco },
    { key: "materiaux", label: "Matériaux", component: MateriauxEco },
    { key: "dechets", label: "Déchets", component: DechetsEco },
    { key: "transport", label: "Transport", component: TransportEco },
  ];

  const totalGlobal = Object.values(totaux).reduce((a, b) => a + b, 0);

  return (
    <div className="relative min-h-screen bg-gray-900 text-gray-100 font-sans">
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

      {/* Overlay + menu latéral */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="fixed top-0 left-0 h-full w-64 bg-gray-800 p-5 shadow-lg z-50 space-y-5 animate-slide-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-orange-400">Navigation</h2>
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

            <button
              className="block w-full text-left text-orange-400 font-semibold py-2 px-3 rounded hover:bg-gray-700"
              onClick={() => {
                setSelectedStep(null);
                setMenuOpen(false);
              }}
            >
              🌿 Tout afficher
            </button>

            {steps.map(({ key, label }) => (
              <button
                key={key}
                className={`block w-full text-left py-2 px-3 rounded hover:bg-gray-700 ${
                  selectedStep === key
                    ? "bg-gray-700 font-semibold text-orange-300"
                    : "text-gray-300"
                }`}
                onClick={() => {
                  setSelectedStep(key);
                  setMenuOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </aside>
        </>
      )}

      {/* Contenu principal */}
      <main className="max-w-5xl mx-auto p-6 space-y-10">
        <h1 className="text-3xl font-bold text-orange-400 text-center mt-8 mb-6">
          🌿 Calculs écologiques du projet
        </h1>

        <div className="space-y-10">
          {selectedStep === null
            ? steps.map(({ key, component: Component }) => (
                <Component
                  key={key}
                  currency={currency}
                  onTotalChange={(total) => handleStepTotalChange(key, total)}
                  onMateriauxChange={(materiauxStep) =>
                    handleMaterialsChange(key, materiauxStep)
                  }
                />
              ))
            : (() => {
                const step = steps.find((s) => s.key === selectedStep);
                if (!step) return null;
                const StepComponent = step.component;
                return (
                  <StepComponent
                    currency={currency}
                    onTotalChange={(total) =>
                      handleStepTotalChange(step.key, total)
                    }
                    onMateriauxChange={(materiauxStep) =>
                      handleMaterialsChange(step.key, materiauxStep)
                    }
                  />
                );
              })()}
        </div>

        <div className="text-3xl font-bold text-center text-orange-400 mt-12">
          💰 Total global estimé : {totalGlobal.toLocaleString()} {currency}
        </div>

        <div className="mt-12">
          <DevisEco
            quantitesParOuvrage={quantitesParOuvrage}
            currency={currency}
          />
        </div>
      </main>

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
