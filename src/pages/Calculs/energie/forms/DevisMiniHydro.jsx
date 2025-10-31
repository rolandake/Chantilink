import React from 'react';
import { useState, useEffect } from 'react';
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// Exemple d’ouvrages et matériaux typiques pour un projet Mini-Hydro
const ouvragesInit = [
  {
    nom: "Barrage",
    materiaux: ["Béton", "Ferraillage", "Sable", "Ciment", "Gravier", "Étanchéité"],
  },
  {
    nom: "Canal d'amenée",
    materiaux: ["Béton", "Terre", "Gravier", "Clôture"],
  },
  {
    nom: "Station de production",
    materiaux: ["Tôle", "Cuivre", "Transformateur", "Câbles", "Tableau électrique"],
  },
  {
    nom: "Turbine",
    materiaux: ["Acier", "Roulements", "Garnitures", "Visserie"],
  },
  {
    nom: "Installations annexes",
    materiaux: ["Panneaux solaires", "Batteries", "Câblage", "Protection"],
  },
];

const LS_KEYS = {
  ouvrages: "devis_minihydro_ouvrages",
  prixUnitaires: "devis_minihydro_prixUnitaires",
};

export default function DevisMiniHydro({ currency = "XOF" }) {
  const [ouvrages, setOuvrages] = useState(() => {
    try {
      const stored = localStorage.getItem(LS_KEYS.ouvrages);
      if (stored) return JSON.parse(stored);
    } catch {}
    return ouvragesInit.map(({ nom, materiaux }) => ({
      nom,
      materiaux: materiaux.map((m) => ({ nom: m, quantite: "" })),
    }));
  });

  const [prixUnitaires, setPrixUnitaires] = useState(() => {
    const mats = new Set();
    ouvragesInit.forEach(({ materiaux }) =>
      materiaux.forEach((m) => mats.add(m.toLowerCase()))
    );
    const base = {};
    mats.forEach((m) => (base[m] = ""));
    try {
      const stored = localStorage.getItem(LS_KEYS.prixUnitaires);
      if (stored) return { ...base, ...JSON.parse(stored) };
    } catch {}
    return base;
  });

  useEffect(() => {
    localStorage.setItem(LS_KEYS.ouvrages, JSON.stringify(ouvrages));
  }, [ouvrages]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.prixUnitaires, JSON.stringify(prixUnitaires));
  }, [prixUnitaires]);

  const handleQuantiteChange = (indexOuvrage, nomMat, val) => {
    setOuvrages((prev) => {
      const copy = [...prev];
      const ouvrage = copy[indexOuvrage];
      ouvrage.materiaux = ouvrage.materiaux.map((m) =>
        m.nom === nomMat ? { ...m, quantite: val } : m
      );
      return copy;
    });
  };

  const handlePrixUnitaireChange = (mat, val) => {
    setPrixUnitaires((prev) => ({ ...prev, [mat]: val }));
  };

  const ajouterOuvrage = () => {
    const nom = prompt("Nom du nouvel ouvrage Mini-Hydro :");
    if (!nom) return;
    const nomTrim = nom.trim();
    if (!nomTrim) return alert("Nom invalide");
    if (ouvrages.some((o) => o.nom.toLowerCase() === nomTrim.toLowerCase())) {
      alert("Un ouvrage avec ce nom existe déjà");
      return;
    }
    setOuvrages((prev) => [...prev, { nom: nomTrim, materiaux: [] }]);
  };

  const supprimerOuvrage = (index) => {
    if (!confirm(`Supprimer l'ouvrage "${ouvrages[index].nom}" ?`)) return;
    setOuvrages((prev) => prev.filter((_, i) => i !== index));
  };

  const ajouterMateriauDansOuvrage = (indexOuvrage) => {
    const nomMat = prompt("Nom du matériau à ajouter dans cet ouvrage :");
    if (!nomMat) return;
    const nomTrim = nomMat.trim();
    if (!nomTrim) return alert("Nom matériau invalide");
    setOuvrages((prev) => {
      const copy = [...prev];
      const ouvrage = copy[indexOuvrage];
      if (
        ouvrage.materiaux.some(
          (m) => m.nom.toLowerCase() === nomTrim.toLowerCase()
        )
      ) {
        alert("Ce matériau existe déjà dans cet ouvrage");
        return prev;
      }
      ouvrage.materiaux.push({ nom: nomTrim, quantite: "" });
      return copy;
    });
    const matLower = nomTrim.toLowerCase();
    if (!(matLower in prixUnitaires)) {
      setPrixUnitaires((prev) => ({ ...prev, [matLower]: "" }));
    }
  };

  const supprimerMateriauDansOuvrage = (indexOuvrage, nomMat) => {
    if (!confirm(`Supprimer le matériau "${nomMat}" ?`)) return;
    setOuvrages((prev) => {
      const copy = [...prev];
      copy[indexOuvrage].materiaux = copy[indexOuvrage].materiaux.filter(
        (m) => m.nom !== nomMat
      );
      return copy;
    });
  };

  // Calculs cumulés
  const [cumul, setCumul] = useState({});
  const [couts, setCouts] = useState({});
  const [totalGlobal, setTotalGlobal] = useState(0);

  useEffect(() => {
    const newCumul = {};
    ouvrages.forEach(({ materiaux }) => {
      materiaux.forEach(({ nom, quantite }) => {
        const mLower = nom.toLowerCase();
        const qte = parseFloat((quantite ?? "").toString().replace(",", "."));
        if (!isNaN(qte)) {
          newCumul[mLower] = (newCumul[mLower] || 0) + qte;
        }
      });
    });

    const newCouts = {};
    Object.keys(newCumul).forEach((m) => {
      const qte = newCumul[m] || 0;
      const pu = parseFloat((prixUnitaires[m] ?? "").toString().replace(",", ".")) || 0;
      newCouts[m] = qte * pu;
    });

    setCumul(newCumul);
    setCouts(newCouts);
    setTotalGlobal(Object.values(newCouts).reduce((a, b) => a + b, 0));
  }, [ouvrages, prixUnitaires]);

  const reinitialiserDevis = () => {
    if (!confirm("Réinitialiser tout le devis ?")) return;
    setOuvrages(
      ouvragesInit.map(({ nom, materiaux }) => ({
        nom,
        materiaux: materiaux.map((m) => ({ nom: m, quantite: "" })),
      }))
    );
    setPrixUnitaires({});
  };

  // Export Excel
  const exportToExcel = () => {
    const detailData = [];
    ouvrages.forEach(({ nom, materiaux }) => {
      materiaux.forEach(({ nom: matNom, quantite }, i) => {
        detailData.push({
          Ouvrage: i === 0 ? nom : "",
          Matériau: matNom,
          Quantité: quantite || 0,
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const wsDetail = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, wsDetail, "Détail par ouvrage");

    const cumulData = Object.keys(cumul).map((m) => ({
      Matériau: m,
      Quantité: cumul[m].toFixed(2),
      "Prix unitaire": prixUnitaires[m],
      Total: couts[m].toFixed(2),
      Devise: currency,
    }));
    cumulData.push({
      Matériau: "Total TTC",
      Total: totalGlobal.toFixed(2),
      Devise: currency,
    });

    const wsCumul = XLSX.utils.json_to_sheet(cumulData);
    XLSX.utils.book_append_sheet(wb, wsCumul, "Cumul global");

    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    XLSX.writeFile(wb, `devis_minihydro_${dateStr}.xlsx`);
  };

  // Export PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.text("Devis Mini-Hydro", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(14);
    doc.text("1. Détail par ouvrage", 14, 30);

    const detailBody = [];
    ouvrages.forEach(({ nom, materiaux }) => {
      materiaux.forEach(({ nom: matNom, quantite }, i) => {
        detailBody.push([i === 0 ? nom : "", matNom, quantite || ""]);
      });
    });

    doc.autoTable({
      startY: 35,
      head: [["Ouvrage", "Matériau", "Quantité"]],
      body: detailBody,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [0, 102, 204] },
    });

    let y = doc.lastAutoTable.finalY + 10;
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
      head: [["Matériau", "Quantité", `Prix unitaire (${currency})`, `Total (${currency})`]],
      body: cumulBody,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [0, 102, 204] },
    });

    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    doc.save(`devis_minihydro_${dateStr}.pdf`);
  };

  return (
    <div className="p-6 bg-gray-900 text-white max-w-6xl mx-auto rounded">
      <h1 className="text-3xl font-bold text-center mb-6 text-blue-400">Devis Mini-Hydro</h1>

      <div className="flex justify-end gap-3 mb-4">
        <button
          onClick={ajouterOuvrage}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
        >
          + Ajouter Ouvrage
        </button>
        <button
          onClick={reinitialiserDevis}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
        >
          Réinitialiser
        </button>
      </div>

      {ouvrages.map(({ nom, materiaux }, idx) => (
        <section key={idx} className="mb-6 bg-gray-800 p-4 rounded">
          <div className="flex justify-between mb-2">
            <h2 className="text-xl font-semibold">{nom}</h2>
            <button
              onClick={() => supprimerOuvrage(idx)}
              className="text-red-500 hover:underline"
            >
              Supprimer ouvrage
            </button>
          </div>

          <button
            onClick={() => ajouterMateriauDansOuvrage(idx)}
            className="text-green-400 hover:underline mb-2"
          >
            + Ajouter matériau
          </button>

          <table className="w-full table-auto border border-gray-700 mb-2">
            <thead>
              <tr>
                <th className="px-2 py-1 border">Matériau</th>
                <th className="px-2 py-1 border">Quantité</th>
                <th className="px-2 py-1 border">Supprimer</th>
              </tr>
            </thead>
            <tbody>
              {materiaux.map(({ nom: matNom, quantite }) => (
                <tr key={matNom}>
                  <td className="border px-2 py-1">{matNom}</td>
                  <td className="border px-2 py-1">
                    <input
                      value={quantite}
                      onInput={(e) =>
                        handleQuantiteChange(idx, matNom, e.currentTarget.value)
                      }
                      className="w-24 p-1 bg-gray-700 text-right"
                      placeholder="0"
                    />
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <button
                      onClick={() => supprimerMateriauDansOuvrage(idx, matNom)}
                      className="text-red-500 hover:underline"
                    >
                      ×
                    </button>
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
              <th className="px-2 py-1 border">Prix unitaire ({currency})</th>
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
            <tr className="bg-gray-800 font-bold text-blue-400">
              <td className="border px-2 py-1">Total TTC</td>
              <td></td>
              <td></td>
              <td className="border px-2 py-1 text-right">{totalGlobal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className="text-center mt-6 space-x-4">
        <button
          onClick={exportToExcel}
          className="bg-blue-600 px-6 py-2 rounded hover:bg-blue-700"
        >
          Export Excel
        </button>
        <button
          onClick={exportToPDF}
          className="bg-indigo-700 px-6 py-2 rounded hover:bg-indigo-800"
        >
          Export PDF
        </button>
      </div>
    </div>
  );
}


