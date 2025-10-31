import React from 'react';
import { useState } from 'react';
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

import PuissanceTotale from "./PuissanceTotale.jsx";
import CourantsCharge from "./CourantsCharge.jsx";
import SectionConducteurs from "./SectionConducteurs.jsx";
import Protections from "./Protections.jsx";
import PertesElectriques from "./PertesElectriques.jsx";
import ChutesTension from "./ChutesTension.jsx";
import CapaciteEquipements from "./CapaciteEquipements.jsx";
import CoutTotal from "./CoutTotal.jsx";

const steps = [
  { key: "puissance", label: "Puissance totale", component: PuissanceTotale },
  { key: "courants", label: "Courants de charge", component: CourantsCharge },
  { key: "section", label: "Section conducteurs", component: SectionConducteurs },
  { key: "protections", label: "Protections électriques", component: Protections },
  { key: "pertes", label: "Pertes électriques", component: PertesElectriques },
  { key: "chutes", label: "Chutes de tension", component: ChutesTension },
  { key: "capacite", label: "Capacité équipements", component: CapaciteEquipements },
  { key: "cout", label: "Coût total", component: CoutTotal },
];

export default function ReseauElectrique() {
  const [currentStep, setCurrentStep] = useState(0);

  // Récupère tous les résultats de chaque étape si besoin (ici exemple vide, à adapter)
  const results = {
    // tu peux collecter ici des états ou données venant de chaque sous-composant,
    // soit via un contexte, props, callback, ou store global
  };

  const StepComponent = steps[currentStep].component;

  // Fonction pour exporter PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.text("Rapport Réseau Électrique", pageWidth / 2, 20, { align: "center" });

    // Exemple simple d’un tableau résumé — à adapter avec tes données réelles
    doc.setFontSize(14);
    doc.text("Résumé des calculs", 14, 30);
    const body = steps.map((step, i) => [i + 1, step.label, "Données à remplir"]);

    doc.autoTable({
      startY: 35,
      head: [["N°", "Étape", "Résultats"]],
      body,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [255, 165, 0] },
    });

    doc.save(`Rapport_Reseau_Electrique_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Fonction pour exporter Excel
  const exportToExcel = () => {
    // Exemple de données — à remplacer par tes données réelles
    const data = steps.map((step, i) => ({
      Numero: i + 1,
      Etape: step.label,
      Resultats: "Données à remplir",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Résumé Calculs");

    XLSX.writeFile(wb, `Rapport_Reseau_Electrique_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-900 text-gray-300 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-orange-400 text-center">
        Projet Réseau Électrique - Calculs
      </h1>

      <div className="mb-6 flex justify-center gap-4">
        <select
          className="bg-gray-800 text-gray-300 px-4 py-2 rounded w-full max-w-md"
          value={currentStep}
          onChange={(e) => setCurrentStep(Number(e.currentTarget.value))}
        >
          {steps.map(({ label }, i) => (
            <option key={i} value={i}>
              {label}
            </option>
          ))}
        </select>

        {/* Boutons Export */}
        <button
          onClick={exportToPDF}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          title="Exporter en PDF"
        >
          🧾 Exporter PDF
        </button>
        <button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          title="Exporter en Excel"
        >
          📊 Exporter Excel
        </button>
      </div>

      <main className="bg-gray-800 p-6 rounded shadow-inner min-h-[300px]">
        <StepComponent onNext={() => setCurrentStep((s) => Math.min(s + 1, steps.length - 1))} />
      </main>

      <footer className="mt-6 flex justify-between max-w-md mx-auto">
        <button
          disabled={currentStep === 0}
          onClick={() => setCurrentStep((s) => Math.max(s - 1, 0))}
          className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
        >
          Précédent
        </button>
        <button
          disabled={currentStep === steps.length - 1}
          onClick={() => setCurrentStep((s) => Math.min(s + 1, steps.length - 1))}
          className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
        >
          Suivant
        </button>
      </footer>
    </div>
  );
}


