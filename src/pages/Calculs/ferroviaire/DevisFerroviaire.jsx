import React from 'react';
import { useState, useEffect } from 'react';
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// Étapes ferroviaires types avec matériaux
const ferroviaireInit = [
  { nom: "Terrassement", materiaux: ["Terre", "Gravier", "Eau", "Engin"] },
  { nom: "Pose des Rails", materiaux: ["Rails", "Traverses", "Ballast"] },
  { nom: "Électrification", materiaux: ["Câbles", "Poteaux", "Isolants"] },
  { nom: "Signalisation", materiaux: ["Panneaux", "Capteurs", "Câblage"] },
  { nom: "Gares", materiaux: ["Béton", "Fer", "Toiture", "Peinture"] },
  { nom: "Ouvrages d'art", materiaux: ["Béton Armé", "Acier", "Coffrage"] },
];

export default function DevisFerroviaire({ currency = "XOF" }) {
  const [etapes, setEtapes] = useState(() => {
    return ferroviaireInit.map(({ nom, materiaux }) => ({
      nom,
      materiaux: materiaux.map((m) => ({ nom: m, quantite: "" })),
    }));
  });

  const [prixUnitaires, setPrixUnitaires] = useState(() => {
    const mats = new Set();
    ferroviaireInit.forEach(({ materiaux }) => materiaux.forEach((m) => mats.add(m.toLowerCase())));
    const obj = {};
    mats.forEach((m) => (obj[m] = ""));
    return obj;
  });

  const handleQuantiteChange = (index, matNom, val) => {
    setEtapes((prev) => {
      const copy = [...prev];
      copy[index].materiaux = copy[index].materiaux.map((m) =>
        m.nom === matNom ? { ...m, quantite: val } : m
      );
      return copy;
    });
  };

  const handlePrixUnitaireChange = (mat, val) => {
    setPrixUnitaires((prev) => ({ ...prev, [mat]: val }));
  };

  const [cumul, setCumul] = useState({});
  const [couts, setCouts] = useState({});
  const [totalGlobal, setTotalGlobal] = useState(0);

  useEffect(() => {
    const newCumul = {};
    etapes.forEach(({ materiaux }) => {
      materiaux.forEach(({ nom, quantite }) => {
        const m = nom.toLowerCase();
        const qte = parseFloat((quantite ?? "").toString().replace(",", "."));
        if (!isNaN(qte)) {
          newCumul[m] = (newCumul[m] || 0) + qte;
        }
      });
    });
    const newCouts = {};
    Object.keys(newCumul).forEach((m) => {
      const pu = parseFloat((prixUnitaires[m] ?? "").toString().replace(",", ".")) || 0;
      newCouts[m] = newCumul[m] * pu;
    });
    setCumul(newCumul);
    setCouts(newCouts);
    setTotalGlobal(Object.values(newCouts).reduce((a, b) => a + b, 0));
  }, [etapes, prixUnitaires]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const details = [];
    etapes.forEach(({ nom, materiaux }) => {
      materiaux.forEach(({ nom: mat, quantite }, i) => {
        details.push({ Étape: i === 0 ? nom : "", Matériau: mat, Quantité: quantite });
      });
    });
    const wsDetails = XLSX.utils.json_to_sheet(details);
    XLSX.utils.book_append_sheet(wb, wsDetails, "Détail par étape");

    const cumulData = Object.keys(cumul).map((m) => ({
      Matériau: m,
      Quantité: cumul[m].toFixed(2),
      "Prix unitaire": prixUnitaires[m],
      Total: couts[m].toFixed(2),
      Devise: currency,
    }));
    cumulData.push({ Matériau: "Total TTC", Total: totalGlobal.toFixed(2), Devise: currency });
    const wsCumul = XLSX.utils.json_to_sheet(cumulData);
    XLSX.utils.book_append_sheet(wb, wsCumul, "Cumul global");

    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    XLSX.writeFile(wb, `devis_ferroviaire_${dateStr}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Devis Projet Ferroviaire", 105, 20, { align: "center" });

    doc.text("1. Détail par étape", 14, 30);
    const detailBody = [];
    etapes.forEach(({ nom, materiaux }) => {
      materiaux.forEach(({ nom: mat, quantite }, i) => {
        detailBody.push([i === 0 ? nom : "", mat, quantite || ""]);
      });
    });
    doc.autoTable({
      startY: 35,
      head: [["Étape", "Matériau", "Quantité"]],
      body: detailBody,
      headStyles: { fillColor: [255, 165, 0] },
    });

    const y = doc.lastAutoTable.finalY + 10;
    doc.text("2. Cumul global", 14, y);
    const cumulBody = Object.keys(cumul).map((m) => [
      m,
      cumul[m].toFixed(2),
      prixUnitaires[m] || "",
      couts[m]?.toFixed(2) || "0.00",
    ]);
    cumulBody.push(["Total TTC", "", "", totalGlobal.toFixed(2)]);
    doc.autoTable({
      startY: y + 5,
      head: [["Matériau", "Quantité", `PU (${currency})`, `Total (${currency})`]],
      body: cumulBody,
      headStyles: { fillColor: [255, 165, 0] },
    });

    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    doc.save(`devis_ferroviaire_${dateStr}.pdf`);
  };

  return (
    <div className="p-6 bg-gray-900 text-white max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6 text-orange-400">Devis Projet Ferroviaire</h1>

      {etapes.map(({ nom, materiaux }, idx) => (
        <section key={idx} className="mb-6 bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">{nom}</h2>
          <table className="w-full table-auto border border-gray-700 mb-2">
            <thead>
              <tr>
                <th className="px-2 py-1 border">Matériau</th>
                <th className="px-2 py-1 border">Quantité</th>
              </tr>
            </thead>
            <tbody>
              {materiaux.map(({ nom: matNom, quantite }) => (
                <tr key={matNom}>
                  <td className="border px-2 py-1">{matNom}</td>
                  <td className="border px-2 py-1">
                    <input
                      value={quantite}
                      onInput={(e) => handleQuantiteChange(idx, matNom, e.currentTarget.value)}
                      className="w-24 p-1 bg-gray-700 text-right"
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-3">Cumul global</h2>
        <table className="w-full table-auto border border-gray-700">
          <thead>
            <tr>
              <th className="px-2 py-1 border">Matériau</th>
              <th className="px-2 py-1 border">Quantité</th>
              <th className="px-2 py-1 border">PU ({currency})</th>
              <th className="px-2 py-1 border">Total ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(cumul).map(([mat, qte]) => (
              <tr key={mat}>
                <td className="border px-2 py-1">{mat}</td>
                <td className="border px-2 py-1 text-right">{qte.toFixed(2)}</td>
                <td className="border px-2 py-1 text-right">
                  <input
                    value={prixUnitaires[mat] || ""}
                    onInput={(e) => handlePrixUnitaireChange(mat, e.currentTarget.value)}
                    className="w-20 p-1 bg-gray-700 text-right"
                  />
                </td>
                <td className="border px-2 py-1 text-right text-green-400">
                  {(couts[mat] || 0).toFixed(2)}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-800 font-bold text-orange-400">
              <td className="border px-2 py-1">Total TTC</td>
              <td></td>
              <td></td>
              <td className="border px-2 py-1 text-right">{totalGlobal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className="text-center mt-6 space-x-4">
        <button onClick={exportExcel} className="bg-orange-500 px-6 py-2 rounded hover:bg-orange-600">
          Export Excel
        </button>
        <button onClick={exportPDF} className="bg-blue-600 px-6 py-2 rounded hover:bg-blue-700">
          Export PDF
        </button>
      </div>
    </div>
  );
}