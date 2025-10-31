import React from 'react';
import { useState } from 'react';

import EtudeFaisabilite from "./EtudeFaisabilitee.jsx";
import Dimensionnement from "./Dimensionnement.jsx";
import Installation from "./Instalation.jsx";
import TestMiseEnService from "./TestMiseEnService.jsx";
import DevisMiniHydro from "./DevisMiniHydro.jsx";

const steps = [
  { key: "faisabilite", label: "Étude de faisabilité", component: EtudeFaisabilite },
  { key: "dimensionnement", label: "Dimensionnement technique", component: Dimensionnement },
  { key: "instalation", label: "Instalation", component: Installation },
  { key: "mise_en_service", label: "Test & mise en service", component: TestMiseEnService },
  { key: "devis", label: "Devis", component: DevisMiniHydro },
];

export default function MiniHydro() {
  const [currentStep, setCurrentStep] = useState(0);
  const StepComponent = steps[currentStep].component;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-900 text-gray-300 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-orange-400 text-center">
        Projet Mini Hydro - Étapes
      </h1>

      <div className="mb-6 flex justify-center">
        <select
          className="bg-gray-800 text-gray-300 px-4 py-2 rounded w-full max-w-md"
          value={currentStep}
          onChange={(e) => setCurrentStep(Number(e.currentTarget.value))}
          aria-label="Choix de l'étape"
        >
          {steps.map(({ label }, i) => (
            <option key={i} value={i}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <main className="bg-gray-800 p-6 rounded shadow-inner min-h-[300px]">
        <StepComponent onNext={() => setCurrentStep((s) => Math.min(s + 1, steps.length - 1))} />
      </main>

      <footer className="mt-6 flex justify-between max-w-md mx-auto">
        <button
          disabled={currentStep === 0}
          onClick={() => setCurrentStep((s) => Math.max(s - 1, 0))}
          className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
          aria-label="Étape précédente"
        >
          Précédent
        </button>
        <button
          disabled={currentStep === steps.length - 1}
          onClick={() => setCurrentStep((s) => Math.min(s + 1, steps.length - 1))}
          className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
          aria-label="Étape suivante"
        >
          Suivant
        </button>
      </footer>
    </div>
  );
}


