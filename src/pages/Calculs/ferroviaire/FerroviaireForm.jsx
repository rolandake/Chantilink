import React from 'react';
import { useState, useEffect } from 'react';

import EtudeFaisabilite from "./EtudeFaisabilite";
import ConceptionPreliminaire from "./ConceptionPreliminaire";
import EvaluationImpact from "./EvaluationImpact";
import EtudesDetaillees from "./EtudesDetaillees";
import AcquisitionTerrain from "./AcquisitionTerrain";
import ConstructionInfrastructure from "./ConstructionInfrastructure";
import PoseRails from "./PoseRails";
import Electrification from "./Electrification";
import InstallationSignalisation from "./InstallationSignalisation";
import EssaisTests from "./EssaisTests";
import MiseEnService from "./MiseEnService";
import SuiviMaintenance from "./SuiviMaintenance";
import ProjetTracker from "./ProjetTracker";
import DevisFerroviaire from "./DevisFerroviaire";

const STORAGE_KEY = "ferroviaireform-costs";

const steps = [
  { id: "etudeFaisabilite", label: "Étude de faisabilité", component: EtudeFaisabilite },
  { id: "conceptionPreliminaire", label: "Conception préliminaire", component: ConceptionPreliminaire },
  { id: "evaluationImpact", label: "Évaluation d'impact", component: EvaluationImpact },
  { id: "etudesDetaillees", label: "Études détaillées", component: EtudesDetaillees },
  { id: "acquisitionTerrain", label: "Acquisition du terrain", component: AcquisitionTerrain },
  { id: "constructionInfrastructure", label: "Construction infrastructure", component: ConstructionInfrastructure },
  { id: "poseRails", label: "Pose des rails", component: PoseRails },
  { id: "electrification", label: "Électrification", component: Electrification },
  { id: "installationSignalisation", label: "Installation signalisation", component: InstallationSignalisation },
  { id: "essaisTests", label: "Essais & tests", component: EssaisTests },
  { id: "miseEnService", label: "Mise en service", component: MiseEnService },
  { id: "suiviMaintenance", label: "Suivi & maintenance", component: SuiviMaintenance },
  { id: "projetTracker", label: "Suivi du projet", component: ProjetTracker },
  { id: "devisFerroviaire", label: "📄 Devis ferroviaire", component: DevisFerroviaire },
];

export default function FerroviaireForm() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);
  const [currency, setCurrency] = useState("FCFA");

  const [costs, setCosts] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : steps.reduce((acc, s) => ({ ...acc, [s.id]: 0 }), {});
  });

  const [quantitiesByStep, setQuantitiesByStep] = useState({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(costs));
  }, [costs]);

  const handleCostChange = (stepId) => (value) => {
    setCosts(prev => ({ ...prev, [stepId]: Number(value) || 0 }));
  };

  const handleQuantitiesChange = (stepId, materials) => {
    setQuantitiesByStep(prev => ({ ...prev, [stepId]: materials }));
  };

  const totalGeneral = Object.values(costs).reduce((acc, v) => acc + v, 0);

  const generatePDFData = () => alert("Export PDF non implémenté ici.");
  const generateExcelData = () => alert("Export Excel non implémenté ici.");

  return (
    <div className="relative min-h-screen bg-gray-900 text-white font-sans">
      {/* Sélecteur de devise */}
      <div className="fixed top-4 right-4 z-50">
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="bg-gray-800 text-orange-400 border border-gray-600 px-3 py-1 rounded shadow"
        >
          <option value="FCFA">FCFA</option>
          <option value="XOF">XOF</option>
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
        </select>
      </div>

      {/* BOUTON MENU BURGER */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-md hover:bg-gray-700"
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

      {/* MENU LATÉRAL */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setMenuOpen(false)} />
          <aside className="fixed top-0 left-0 h-full w-64 bg-gray-800 p-5 z-50 shadow-lg animate-slide-in space-y-3">
            <h2 className="text-lg font-bold text-orange-400 mb-4">Navigation Ferroviaire</h2>
            <button
              className="w-full text-left py-2 px-3 rounded hover:bg-gray-700 text-orange-300 font-semibold"
              onClick={() => {
                setSelectedStep(null);
                setMenuOpen(false);
              }}
            >
              🚧 Tout afficher
            </button>
            {steps.map(({ id, label }) => (
              <button
                key={id}
                className={`block w-full text-left py-2 px-3 rounded hover:bg-gray-700 ${
                  selectedStep === id ? "bg-gray-700 text-orange-300 font-semibold" : "text-gray-300"
                }`}
                onClick={() => {
                  setSelectedStep(id);
                  setMenuOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </aside>
        </>
      )}

      {/* CONTENU PRINCIPAL */}
      <main className="max-w-5xl mx-auto p-6 space-y-10">
        <h1 className="text-3xl font-bold text-orange-400 text-center mt-8">
          🚄 Calculs du Projet Ferroviaire
        </h1>

        <div className="space-y-10 mt-6">
          {selectedStep === null
            ? steps.map(({ id, component: Component }) => (
                <Component
                  key={id}
                  currency={currency}
                  onCostChange={handleCostChange(id)}
                  onMateriauxChange={(mats) => handleQuantitiesChange(id, mats)}
                />
              ))
            : (() => {
                const step = steps.find((s) => s.id === selectedStep);
                if (!step) return null;
                const StepComponent = step.component;
                return (
                  <StepComponent
                    currency={currency}
                    onCostChange={handleCostChange(step.id)}
                    onMateriauxChange={(mats) => handleQuantitiesChange(step.id, mats)}
                  />
                );
              })()}
        </div>

        <div className="text-3xl font-bold text-center text-orange-400 mt-12">
          💰 Total général : {totalGeneral.toLocaleString()} {currency}
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={generatePDFData}
          >
            Exporter en PDF
          </button>
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            onClick={generateExcelData}
          >
            Exporter en Excel
          </button>
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
