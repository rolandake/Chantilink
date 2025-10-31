import React from 'react';
import { useState } from 'react';

import EtudeFaisabilite from "./EtudeFaisabilite.jsx";
import ConceptionTechnique from "./ConceptionTechnique.jsx";
import DevisCentraleSolaire from "./DevisCentraleSolaire.jsx";
import ObtentionAutorisations from "./ObtentionAutorisations.jsx";
import ApprovisionnementLogistique from "./ApprovisionnementLogistique.jsx";
import PreparationSite from "./PreparationSite.jsx";
import Installation from "./Installation.jsx";
import MiseEnService from "./MiseEnService.jsx";
import SuiviMaintenance from "./SuiviMaintenance.jsx";

const steps = [
  { key: "faisabilite", label: "Étude de faisabilité", component: EtudeFaisabilite },
  { key: "conception", label: "Conception technique", component: ConceptionTechnique },
  { key: "devis", label: "Devis", component: DevisCentraleSolaire },
  { key: "autorisations", label: "Autorisations", component: ObtentionAutorisations },
  { key: "approvisionnement", label: "Approvisionnement", component: ApprovisionnementLogistique },
  { key: "preparation", label: "Préparation du site", component: PreparationSite },
  { key: "installation", label: "Installation", component: Installation },
  { key: "mise_en_service", label: "Mise en service", component: MiseEnService },
  { key: "maintenance", label: "Suivi & maintenance", component: SuiviMaintenance },
];

export default function CentraleSolaire({ currency = "XOF" }) {
  const [currentStep, setCurrentStep] = useState("faisabilite");

  const StepComponent = steps.find((step) => step.key === currentStep)?.component;

  return (
    <div className="p-4 bg-gray-900 text-gray-300 max-w-4xl mx-auto rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-orange-400 mb-4 text-center">
        ☀️ Projet : Centrale Solaire
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        {steps.map(({ key, label }) => (
          <button
            key={key}
            className={`text-sm px-3 py-2 rounded ${
              currentStep === key
                ? "bg-orange-500 text-white font-semibold"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
            onClick={() => setCurrentStep(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-gray-800 p-4 rounded-md shadow-inner min-h-[300px]">
        {StepComponent ? (
          <StepComponent currency={currency} />
        ) : (
          <p className="text-center text-red-400">⚠️ Étape non trouvée.</p>
        )}
      </div>
    </div>
  );
}


