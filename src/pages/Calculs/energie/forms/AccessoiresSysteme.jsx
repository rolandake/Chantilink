import React from 'react';
import { useState, useEffect } from 'react';
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

const STORAGE_KEY = "accessoires-systeme-history";

// Ratios = estimation par m² de surface
const accessoiresTypesInit = [
  { id: "supports", label: "Supports/Panneaux", prixUnitaire: 20000, ratio: 0.1 },
  { id: "cables", label: "Câbles (mètre)", prixUnitaire: 1500, ratio: 2 },
  { id: "coffrets", label: "Coffrets électriques", prixUnitaire: 45000, ratio: 0.05 },
  { id: "protections", label: "Protections (disjoncteurs, parafoudres)", prixUnitaire: 30000, ratio: 0.05 },
  { id: "autres", label: "Autres accessoires", prixUnitaire: 10000, ratio: 0.1 },
];

export default function AccessoiresSysteme({ currency = "FCFA", surface = 0 }) {
  const [accessoires, setAccessoires] = useState(() =>
    accessoiresTypesInit.map((a) => ({ ...a, quantite: "" }))
  );
  const [coutInstallationGlobal, setCoutInstallationGlobal] = useState("");
  const [historique, setHistorique] = useState([]);

  // Fonction pour recalculer automatiquement les quantités selon surface
  const recalcQuantites = () => {
    setAccessoires((prev) =>
      prev.map((a) => {
        const autoQuantite = Math.ceil(surface * (a.ratio || 0));
        return {
          ...a,
          quantite: String(autoQuantite),
        };
      })
    );
  };

  // Initialisation et recalcul auto des quantités à la surface
  useEffect(() => {
    recalcQuantites();
  }, [surface]);

  // Historique
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistorique(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historique));
  }, [historique]);

  const handleQuantiteChange = (id, val) => {
    if (/^\d*$/.test(val)) {
      setAccessoires((prev) =>
        prev.map((a) => (a.id === id ? { ...a, quantite: val } : a))
      );
    }
  };

  const handlePrixUnitaireChange = (id, val) => {
    if (/^\d*$/.test(val)) {
      setAccessoires((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, prixUnitaire: val === "" ? "" : Number(val) } : a
        )
      );
    }
  };

  const totalAccessoires =
    accessoires.reduce((sum, a) => {
      const q = parseInt(a.quantite) || 0;
      const p = parseInt(a.prixUnitaire) || 0;
      return sum + q * p;
    }, 0) + (parseInt(coutInstallationGlobal) || 0);

  // Sauvegarde dans historique
  const handleSave = () => {
    if (
      !accessoires.some(
        (a) => (parseInt(a.quantite) || 0) > 0 && (parseInt(a.prixUnitaire) || 0) > 0
      )
    ) {
      alert("⚠️ Veuillez saisir au moins une quantité et un prix valides.");
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      accessoires: accessoires.map((a) => ({
        id: a.id,
        label: a.label,
        quantite: a.quantite || "0",
        prixUnitaire: a.prixUnitaire || 0,
        total: (parseInt(a.quantite) || 0) * (parseInt(a.prixUnitaire) || 0),
      })),
      coutInstallationGlobal: coutInstallationGlobal || "0",
      total: totalAccessoires,
      currency,
    };

    setHistorique([entry, ...historique]);
    alert("✅ Sauvegarde réalisée !");
  };

  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer cette entrée ?")) {
      setHistorique(historique.filter((item) => item.id !== id));
    }
  };

  const clearHistorique = () => {
    if (confirm("🧹 Vider tout l'historique ?")) {
      setHistorique([]);
    }
  };

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Historique Accessoires du système", 14, 20);

    historique.forEach((entry, i) => {
      const startY = 30 + i * 60;
      doc.setFontSize(12);
      doc.text(`Date : ${entry.date}`, 14, startY);
      doc.text(`Coût installation global : ${entry.coutInstallationGlobal} ${entry.currency}`, 14, startY + 6);
      doc.autoTable({
        startY: startY + 10,
        head: [["Accessoire", "Quantité", "Prix Unitaire", "Total"]],
        body: entry.accessoires.map((a) => [
          a.label,
          a.quantite,
          a.prixUnitaire.toLocaleString(),
          a.total.toLocaleString(),
        ]),
      });
      doc.text(`Total : ${entry.total.toLocaleString()} ${entry.currency}`, 14, doc.lastAutoTable.finalY + 6);
      if (i < historique.length - 1) doc.addPage();
    });

    doc.save("accessoires_historique.pdf");
  };

  // Export Excel
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    historique.forEach((entry) => {
      const ws_data = [
        ["Date", entry.date],
        ["Coût installation global", entry.coutInstallationGlobal + " " + entry.currency],
        [],
        ["Accessoire", "Quantité", "Prix Unitaire", "Total"],
        ...entry.accessoires.map((a) => [
          a.label,
          a.quantite,
          a.prixUnitaire,
          a.total,
        ]),
        [],
        ["Total", entry.total + " " + entry.currency],
      ];
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      XLSX.utils.book_append_sheet(wb, ws, entry.date.slice(0, 10));
    });

    XLSX.writeFile(wb, "accessoires_historique.xlsx");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🧰 Accessoires du système</h2>

      <div className="grid grid-cols-1 gap-5 mb-4">
        {accessoires.map(({ id, label, quantite, prixUnitaire }) => (
          <div key={id} className="flex flex-col md:flex-row md:items-center gap-3">
            <label className="flex-1 font-semibold text-orange-400">{label}</label>

            <input
              type="number"
              min="0"
              step="1"
              value={quantite}
              onInput={(e) => handleQuantiteChange(id, e.target.value)}
              className="w-full md:w-24 rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400 text-right"
              placeholder="Qté"
            />

            <input
              type="number"
              min="0"
              step="100"
              value={prixUnitaire}
              onInput={(e) => handlePrixUnitaireChange(id, e.target.value)}
              className="w-full md:w-32 rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400 text-right"
              placeholder={`Prix unitaire (${currency})`}
            />
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <button
          onClick={recalcQuantites}
          className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md font-semibold shadow"
          title="Recalculer automatiquement les quantités selon la surface"
        >
          🔄 Recalcul automatique des quantités
        </button>

        <div className="flex gap-2 items-center">
          <label className="font-semibold text-orange-400">Coût installation global ({currency})</label>
          <input
            type="number"
            min="0"
            step="100"
            value={coutInstallationGlobal}
            onInput={(e) => setCoutInstallationGlobal(e.target.value)}
            className="w-36 rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400 text-right"
            placeholder="Ex: 500000"
          />
        </div>
      </div>

      <div className="bg-gray-800 rounded-md p-4 mb-6 text-right font-bold text-green-400 text-lg">
        Coût total estimé accessoires : {totalAccessoires.toLocaleString()} {currency}
      </div>

      <div className="flex gap-4 justify-center mb-6 flex-wrap">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold shadow"
        >
          💾 Enregistrer dans l'historique
        </button>
        <button
          onClick={clearHistorique}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold shadow"
        >
          🧹 Effacer l'historique
        </button>
        <button
          onClick={exportPDF}
          className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold shadow"
        >
          📄 Export PDF
        </button>
        <button
          onClick={exportExcel}
          className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold shadow"
        >
          📊 Export Excel
        </button>
      </div>

      {historique.length > 0 && (
        <section className="max-h-80 overflow-y-auto bg-gray-800 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
          <h3 className="text-lg font-bold text-orange-400 mb-3 text-center">🕓 Historique des sauvegardes</h3>
          {historique.map(({ id, date, accessoires: accs, coutInstallationGlobal, total: t, currency: cur }) => (
            <div
              key={id}
              className="bg-gray-700 rounded-md p-3 mb-3 flex flex-col md:flex-row justify-between items-start md:items-center text-sm"
            >
              <div className="flex-1 space-y-1 mb-3 md:mb-0 overflow-x-auto">
                <time className="block text-xs text-gray-400">{date}</time>
                <table className="w-full text-left text-gray-300 text-xs border-collapse border border-gray-600 rounded">
                  <thead>
                    <tr>
                      <th className="border border-gray-600 px-1">Accessoire</th>
                      <th className="border border-gray-600 px-1">Qté</th>
                      <th className="border border-gray-600 px-1">Prix Unitaire</th>
                      <th className="border border-gray-600 px-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accs.map(({ id, label, quantite, prixUnitaire, total }) => (
                      <tr key={id}>
                        <td className="border border-gray-600 px-1">{label}</td>
                        <td className="border border-gray-600 px-1 text-right">{quantite}</td>
                        <td className="border border-gray-600 px-1 text-right">{prixUnitaire.toLocaleString()}</td>
                        <td className="border border-gray-600 px-1 text-right">{total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 font-semibold text-orange-400">
                  Coût installation global : {coutInstallationGlobal} {cur}
                </p>
              </div>
              <div className="flex flex-col items-end md:items-center md:ml-4">
                <p className="font-bold text-green-400 mb-2">Total: {t.toLocaleString()} {cur}</p>
                <button
                  onClick={() => handleDelete(id)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold"
                >
                  ✖ Supprimer
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}


