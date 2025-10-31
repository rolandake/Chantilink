// src/pages/Calculs/Calculs.jsx
import React, { useState } from "react";
import { useCalculation } from "../../context/CalculationContext";

// Vos formulaires existants (inchangés)
import BatimentForm from "./batiment/forms/BatimentForm.jsx";
import TPForm from "./tp/forms/TPForm.jsx";
import EcoForm from "./eco/forms/EcoForm.jsx";
import EnergieForm from "./energie/forms/EnergieForm.jsx";
import FerroviaireForm from "./ferroviaire/FerroviaireForm.jsx";

const projectTypes = [
  { value: "tp", label: "Travaux Publics" },
  { value: "batiment", label: "Bâtiment / Construction" },
  { value: "eco", label: "Calculs Écologiques" },
  { value: "energie", label: "Projets Énergie" },
  { value: "ferroviaire", label: "Projet Ferroviaire" },
];

const currencies = [
  { value: "XOF", label: "Franc CFA (XOF)" },
  { value: "FCFA", label: "Franc CFA (FCFA)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "USD", label: "Dollar ($)" },
];

export default function Calculs() {
  const [mode, setMode] = useState("tp");
  const [currency, setCurrency] = useState("XOF");

  // ✅ Récupérer les fonctions du Context avec des valeurs par défaut
  const {
    loading = false,
    error = null,
    success = null,
    clearMessages = () => {}, // ✅ Fonction par défaut si non fournie
  } = useCalculation() || {}; // ✅ Protection si useCalculation retourne undefined

  function renderForm() {
    // ✅ Vos formulaires gardent leur prop `currency` originale
    switch (mode) {
      case "tp":
        return <TPForm currency={currency} />;
      case "batiment":
        return <BatimentForm currency={currency} />;
      case "eco":
        return <EcoForm currency={currency} />;
      case "energie":
        return <EnergieForm currency={currency} />;
      case "ferroviaire":
        return <FerroviaireForm currency={currency} />;
      default:
        return <div className="text-red-400">Type de projet non supporté</div>;
    }
  }

  return (
    <div className="flex flex-col min-h-screen max-w-full mx-auto bg-gray-900 text-gray-300">
      {/* En-tête avec sélecteurs */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="project-select" className="block mb-2 font-semibold text-orange-400">
              Type de projet :
            </label>
            <select 
              id="project-select" 
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-200" 
              value={mode} 
              onChange={(e) => {
                console.log("🔄 [Calculs] Mode changé vers:", e.target.value);
                setMode(e.target.value);
                // ✅ Appel sécurisé de clearMessages
                if (typeof clearMessages === 'function') {
                  clearMessages();
                }
              }}
            >
              {projectTypes.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="currency-select" className="block mb-2 font-semibold text-orange-400">
              Devise :
            </label>
            <select 
              id="currency-select" 
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-200" 
              value={currency} 
              onChange={(e) => {
                console.log("💱 [Calculs] Devise changée vers:", e.target.value);
                setCurrency(e.target.value);
              }}
            >
              {currencies.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ✅ Messages de feedback (Context) */}
        {error && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm max-w-7xl mx-auto">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-900/50 border border-green-500 rounded text-green-200 text-sm max-w-7xl mx-auto">
            {success}
          </div>
        )}
      </div>

      {/* Zone de rendu des formulaires (pleine largeur) */}
      <div className="flex-1 overflow-y-auto">
        {renderForm()}
      </div>

      {/* ✅ Indicateur de chargement global */}
      {loading && (
        <div className="fixed right-4 bottom-24 bg-orange-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Traitement en cours...</span>
        </div>
      )}
    </div>
  );
}