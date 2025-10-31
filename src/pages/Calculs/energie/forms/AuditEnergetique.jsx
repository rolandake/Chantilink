import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

import CollecteDonnees from "./CollecteDonnees.jsx";
import AnalyseConsommation from "./AnalyseConsommation.jsx";
import Recommandations from "./Recommandations.jsx";

const steps = [
  { key: "collecte", label: "Collecte des données", component: CollecteDonnees, storageKey: "audit-collecte-history" },
  { key: "analyse", label: "Analyse consommation", component: AnalyseConsommation, storageKey: "audit-analyse-history" },
  { key: "recommandations", label: "Recommandations", component: Recommandations, storageKey: "audit-recommandations-history" },
];

export default function AuditEnergetique() {
  const [currentStep, setCurrentStep] = useState(0);
  const [allHistoriques, setAllHistoriques] = useState({});

  useEffect(() => {
    const loaded = {};
    for (const step of steps) {
      const saved = localStorage.getItem(step.storageKey);
      if (saved) {
        try {
          loaded[step.key] = JSON.parse(saved);
        } catch {
          loaded[step.key] = [];
        }
      } else {
        loaded[step.key] = [];
      }
    }
    setAllHistoriques(loaded);
  }, []);

  const combinedHistorique = useMemo(() => {
    let combined = [];
    for (const key in allHistoriques) {
      combined = combined.concat(
        (allHistoriques[key] || []).map((item) => ({ ...item, étape: key }))
      );
    }
    combined.sort((a, b) => new Date(b.date) - new Date(a.date));
    return combined;
  }, [allHistoriques]);

  const exportToExcel = () => {
    if (combinedHistorique.length === 0) {
      alert("Aucune donnée à exporter.");
      return;
    }
    const wsData = combinedHistorique.map(({ date, étape, ...rest }) => ({
      Date: date,
      Étape: étape,
      ...rest,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Audit Énergétique");

    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    XLSX.writeFile(wb, `audit_energetique_${dateStr}.xlsx`);
  };

  const exportToPDF = () => {
    if (combinedHistorique.length === 0) {
      alert("Aucune donnée à exporter.");
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text("Audit Énergétique - Données globales", pageWidth / 2, 20, { align: "center" });

    const columnsSet = new Set();
    combinedHistorique.forEach((item) => Object.keys(item).forEach((k) => columnsSet.add(k)));
    const columns = Array.from(columnsSet);

    const headers = columns.map((col) => col.charAt(0).toUpperCase() + col.slice(1));

    const bodyData = combinedHistorique.map((item) =>
      columns.map((col) => (item[col] !== undefined ? String(item[col]) : ""))
    );

    doc.autoTable({
      startY: 30,
      head: [headers],
      body: bodyData,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [255, 165, 0] },
      theme: "striped",
      margin: { top: 30, left: 5, right: 5 },
    });

    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    doc.save(`audit_energetique_${dateStr}.pdf`);
  };

  const StepComponent = steps[currentStep].component;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-900 text-gray-300 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-orange-400 text-center">
        Audit Énergétique - Étapes
      </h1>

      <div className="mb-6 flex justify-center">
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
      </div>

      <main className="bg-gray-800 p-6 rounded shadow-inner min-h-[300px]">
        <StepComponent />
      </main>

      <footer className="mt-6 flex justify-between max-w-md mx-auto flex-wrap gap-4">
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

        <button
          onClick={exportToExcel}
          className="px-4 py-2 rounded bg-green-600 hover:bg-green-700"
          type="button"
        >
          Export Excel global
        </button>
        <button
          onClick={exportToPDF}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
          type="button"
        >
          Export PDF global
        </button>
      </footer>
    </div>
  );
}


