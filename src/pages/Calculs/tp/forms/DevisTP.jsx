import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { PlusIcon, TrashIcon, CalendarIcon, XMarkIcon } from "@heroicons/react/24/solid";

ChartJS.register(ArcElement, Tooltip, Legend);

const ouvragesInit = [
  { nom: "Terrassement", materiaux: ["Terre", "Gravier", "Sable", "Eau", "Engin"] },
  { nom: "Chaussée", materiaux: ["Gravier", "Bitume", "Ciment", "Sable"] },
  { nom: "Ouvrages Hydrauliques", materiaux: ["Béton", "Ferraillage", "Sable", "Ciment"] },
  { nom: "Signalisation", materiaux: ["Panneaux", "Peinture", "Clous", "Béton"] },
  { nom: "Accotements", materiaux: ["Gravier", "Terre", "Sable"] },
  { nom: "Réhabilitation", materiaux: ["Bitume", "Béton", "Engin", "Sable"] },
];

const LS_KEYS = {
  ouvrages: "devis_tp_ouvrages",
  prixUnitaires: "devis_tp_prixUnitaires",
  planning: "devis_tp_planning",
};

export default function DevisTP({ currency = "XOF" }) {
  const [ouvrages, setOuvrages] = useState(() => {
    try { 
      const raw = localStorage.getItem(LS_KEYS.ouvrages); 
      if(raw) return JSON.parse(raw); 
    } catch {}
    return ouvragesInit.map(({ nom, materiaux }) => ({ 
      nom, 
      materiaux: materiaux.map(m => ({ nom: m, quantite: "" })) 
    }));
  });

  const [prixUnitaires, setPrixUnitaires] = useState(() => {
    const mats = new Set();
    ouvragesInit.forEach(({ materiaux }) => materiaux.forEach(m => mats.add(m.toLowerCase())));
    const obj = {};
    mats.forEach(m => obj[m] = "");
    try { 
      const raw = localStorage.getItem(LS_KEYS.prixUnitaires); 
      if (raw) return { ...obj, ...JSON.parse(raw) }; 
    } catch {}
    return obj;
  });

  const [planning, setPlanning] = useState(() => {
    try { 
      const raw = localStorage.getItem(LS_KEYS.planning); 
      if(raw) return JSON.parse(raw); 
    } catch {}
    return [];
  });

  const [showPlanningModal, setShowPlanningModal] = useState(false);

  // ✅ Sauvegarde auto dans localStorage
  useEffect(() => { 
    localStorage.setItem(LS_KEYS.ouvrages, JSON.stringify(ouvrages)); 
  }, [ouvrages]);

  useEffect(() => { 
    localStorage.setItem(LS_KEYS.prixUnitaires, JSON.stringify(prixUnitaires)); 
  }, [prixUnitaires]);

  useEffect(() => { 
    localStorage.setItem(LS_KEYS.planning, JSON.stringify(planning)); 
  }, [planning]);

  // ✅ Handlers optimisés
  const handleQuantiteChange = useCallback((idxOuv, mat, val) => {
    setOuvrages(prev => {
      const copy = [...prev];
      copy[idxOuv].materiaux = copy[idxOuv].materiaux.map(m => 
        m.nom === mat ? { ...m, quantite: val } : m
      );
      return copy;
    });
  }, []);
  
  const handlePrixUnitaireChange = useCallback((mat, val) => {
    setPrixUnitaires(prev => ({ ...prev, [mat]: val }));
  }, []);

  const ajouterOuvrage = useCallback(() => {
    const nom = prompt("Nom du nouvel ouvrage :");
    if (!nom?.trim()) return;
    if (ouvrages.some(o => o.nom.toLowerCase() === nom.trim().toLowerCase())) {
      alert("Nom déjà existant");
      return;
    }
    setOuvrages(prev => [...prev, { nom: nom.trim(), materiaux: [] }]);
  }, [ouvrages]);

  const supprimerOuvrage = useCallback((idx) => {
    if (!confirm(`Supprimer "${ouvrages[idx].nom}" ?`)) return;
    setOuvrages(prev => prev.filter((_, i) => i !== idx));
  }, [ouvrages]);

  const ajouterMateriauDansOuvrage = useCallback((idxOuv) => {
    const nomMat = prompt("Nom du matériau :");
    if (!nomMat?.trim()) return;
    const matTrim = nomMat.trim();
    setOuvrages(prev => {
      const copy = [...prev];
      if (copy[idxOuv].materiaux.some(m => m.nom.toLowerCase() === matTrim.toLowerCase())) {
        alert("Matériau existant");
        return prev;
      }
      copy[idxOuv].materiaux.push({ nom: matTrim, quantite: "" });
      return copy;
    });
    const matLower = matTrim.toLowerCase();
    if (!(matLower in prixUnitaires)) {
      setPrixUnitaires(prev => ({ ...prev, [matLower]: "" }));
    }
  }, [prixUnitaires]);

  const supprimerMateriauDansOuvrage = useCallback((idxOuv, mat) => {
    if (!confirm(`Supprimer "${mat}" ?`)) return;
    setOuvrages(prev => {
      const copy = [...prev];
      copy[idxOuv].materiaux = copy[idxOuv].materiaux.filter(m => m.nom !== mat);
      return copy;
    });
  }, []);

  // ✅ Calculs avec useMemo
  const { cumul, couts, totalGlobal } = useMemo(() => {
    const newCumul = {};
    ouvrages.forEach(({ materiaux }) =>
      materiaux.forEach(({ nom, quantite }) => {
        const m = nom.toLowerCase();
        const q = parseFloat(quantite || "0") || 0;
        newCumul[m] = (newCumul[m] || 0) + q;
      })
    );

    const newCouts = {};
    Object.keys(newCumul).forEach((m) => {
      const q = newCumul[m];
      const pu = parseFloat(prixUnitaires[m] || "0") || 0;
      newCouts[m] = q * pu;
    });

    const total = Object.values(newCouts).reduce((a, b) => a + b, 0);

    return { cumul: newCumul, couts: newCouts, totalGlobal: total };
  }, [ouvrages, prixUnitaires]);

  const reinitialiserDevis = useCallback(() => {
    if (!confirm("Réinitialiser tout ?")) return;
    setOuvrages(ouvragesInit.map(({ nom, materiaux }) => ({ 
      nom, 
      materiaux: materiaux.map(m => ({ nom: m, quantite: "" })) 
    })));
    setPrixUnitaires({});
  }, []);

  const exportToExcel = useCallback(() => {
    const data = [];
    ouvrages.forEach(({ nom, materiaux }) =>
      materiaux.forEach(({ nom: mat, quantite }, i) => 
        data.push({ 
          Ouvrage: i === 0 ? nom : "", 
          Matériau: mat, 
          Quantité: quantite || 0, 
          Total: ((parseFloat(quantite || 0) * parseFloat(prixUnitaires[mat.toLowerCase()] || 0)).toFixed(2)) 
        })
      )
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Détail");
    
    const cumulData = Object.keys(cumul).map(m => ({ 
      Matériau: m, 
      Quantité: cumul[m].toFixed(2), 
      "Prix unitaire": prixUnitaires[m], 
      Total: couts[m].toFixed(2), 
      Devise: currency 
    }));
    cumulData.push({ Matériau: "Total TTC", Total: totalGlobal.toFixed(2), Devise: currency });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cumulData), "Cumul");
    XLSX.writeFile(wb, `devis_tp_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`);
  }, [ouvrages, prixUnitaires, cumul, couts, totalGlobal, currency]);

  const exportToPDF = useCallback(() => {
    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();
    doc.setFontSize(20);
    doc.text("Devis TP", w / 2, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text("1. Détail", 14, 30);
    
    const detailBody = [];
    ouvrages.forEach(({ nom, materiaux }) =>
      materiaux.forEach(({ nom: mat, quantite }, i) => 
        detailBody.push([i === 0 ? nom : "", mat, quantite || ""])
      )
    );
    doc.autoTable({
      startY: 35,
      head: [["Ouvrage", "Matériau", "Quantité"]],
      body: detailBody,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [255, 165, 0] },
    });
    
    let y = doc.lastAutoTable.finalY + 10;
    doc.text("2. Cumul", 14, y);
    const cumulBody = Object.keys(cumul).map(m => [
      m, 
      cumul[m].toFixed(2), 
      prixUnitaires[m] || "", 
      couts[m]?.toFixed(2) || "0.00"
    ]);
    cumulBody.push(["Total TTC", "", "", totalGlobal.toFixed(2)]);
    doc.autoTable({
      startY: y + 5,
      head: [["Matériau", "Quantité", `Prix unitaire (${currency})`, `Total (${currency})`]],
      body: cumulBody,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [255, 165, 0] },
    });
    doc.save(`devis_tp_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.pdf`);
  }, [ouvrages, cumul, prixUnitaires, couts, totalGlobal, currency]);

  // Planning handlers
  const ajouterTachePlanning = useCallback(() => {
    setPlanning(prev => [...prev, { 
      ouvrage: "", 
      dateDebut: "", 
      dateFin: "", 
      responsable: "", 
      statut: "À faire",
      notes: ""
    }]);
  }, []);

  const supprimerTachePlanning = useCallback((idx) => {
    setPlanning(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const modifierTachePlanning = useCallback((idx, field, value) => {
    setPlanning(prev => {
      const copy = [...prev];
      copy[idx][field] = value;
      return copy;
    });
  }, []);

  const exportPlanningToExcel = useCallback(() => {
    const data = planning.map(t => ({
      Ouvrage: t.ouvrage,
      "Date début": t.dateDebut,
      "Date fin": t.dateFin,
      Responsable: t.responsable,
      Statut: t.statut,
      Notes: t.notes
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Planning");
    XLSX.writeFile(wb, `planning_tp_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`);
  }, [planning]);

  const exportPlanningToPDF = useCallback(() => {
    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();
    doc.setFontSize(20);
    doc.text("Planning des Travaux", w / 2, 20, { align: "center" });
    const planningBody = planning.map(t => [
      t.ouvrage, 
      t.dateDebut, 
      t.dateFin, 
      t.responsable, 
      t.statut
    ]);
    doc.autoTable({
      startY: 30,
      head: [["Ouvrage", "Début", "Fin", "Responsable", "Statut"]],
      body: planningBody,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 165, 0] },
    });
    doc.save(`planning_tp_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.pdf`);
  }, [planning]);

  const materialsChartData = {
    labels: Object.keys(cumul),
    datasets: [
      {
        label: "Répartition des matériaux",
        data: Object.values(cumul),
        backgroundColor: [
          "rgba(255, 165, 0, 0.8)",
          "rgba(255, 206, 86, 0.8)",
          "rgba(75, 192, 192, 0.8)",
          "rgba(54, 162, 235, 0.8)",
        ],
        borderColor: ["#fff", "#fff", "#fff", "#fff"],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "bottom", labels: { color: "#FFD700", font: { weight: "bold" } } },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => `${tooltipItem.raw.toFixed(2)} t`,
        },
      },
    },
    animation: {
      animateScale: true,
      animateRotate: true,
    },
  };

  return (
    <div className="p-6 bg-gradient-to-br from-pink-900 via-purple-900 to-indigo-900 min-h-screen text-white">
      <h1 className="text-4xl font-extrabold text-center mb-6 text-yellow-400 drop-shadow-lg">
        📊 Devis Travaux Publics
      </h1>

      <div className="flex flex-wrap justify-end gap-3 mb-6">
        <button onClick={() => setShowPlanningModal(true)} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 px-5 py-2 rounded-full shadow-lg transform hover:scale-105 transition">
          <CalendarIcon className="w-5 h-5" /> Planning
        </button>
        <button onClick={ajouterOuvrage} className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 px-5 py-2 rounded-full shadow-lg transform hover:scale-105 transition">
          <PlusIcon className="w-5 h-5" /> Ajouter Ouvrage
        </button>
        <button onClick={reinitialiserDevis} className="bg-red-500 hover:bg-red-600 px-5 py-2 rounded-full shadow-lg">Réinitialiser</button>
      </div>

      {ouvrages.map(({ nom, materiaux }, idx) => (
        <section key={idx} className="mb-6 bg-gradient-to-r from-purple-800 to-indigo-800 p-4 rounded-2xl shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-2xl font-semibold">{nom}</h2>
            <button onClick={() => supprimerOuvrage(idx)} className="flex items-center gap-1 text-red-400 hover:text-red-600">
              <TrashIcon className="w-5 h-5" /> Supprimer
            </button>
          </div>
          <button onClick={() => ajouterMateriauDansOuvrage(idx)} className="flex items-center gap-1 text-green-300 hover:text-green-400 mb-3">
            <PlusIcon className="w-4 h-4" /> Ajouter matériau
          </button>
          <table className="w-full table-auto border border-gray-700 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold">
                <th className="px-2 py-2">Matériau</th>
                <th className="px-2 py-2">Quantité</th>
                <th className="px-2 py-2">Prix unitaire ({currency})</th>
                <th className="px-2 py-2">Total ({currency})</th>
                <th className="px-2 py-2">Supprimer</th>
              </tr>
            </thead>
            <tbody>
              {materiaux.map(({ nom: mat, quantite }) => {
                const ml = mat.toLowerCase();
                const q = parseFloat(quantite || 0) || 0;
                const pu = parseFloat(prixUnitaires[ml] || 0) || 0;
                return (
                  <tr key={mat} className="hover:bg-gray-700 transition rounded-xl">
                    <td className="px-2 py-1">{mat}</td>
                    <td className="px-2 py-1 text-right">
                      <input 
                        value={quantite} 
                        onChange={e => handleQuantiteChange(idx, mat, e.target.value)} 
                        className="w-20 p-1 bg-gray-900 rounded text-right" 
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input 
                        value={prixUnitaires[ml] || ""} 
                        onChange={e => handlePrixUnitaireChange(ml, e.target.value)} 
                        className="w-20 p-1 bg-gray-900 rounded text-right" 
                      />
                    </td>
                    <td className="px-2 py-1 text-right font-bold text-green-300">{(q * pu).toFixed(2)}</td>
                    <td className="px-2 py-1 text-center">
                      <button onClick={() => supprimerMateriauDansOuvrage(idx, mat)} className="text-red-400 hover:text-red-600">
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      <section className="mt-8 bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 p-4 rounded-2xl shadow-2xl">
        <h2 className="text-2xl font-bold mb-3 text-yellow-300">💰 Cumul global</h2>
        <table className="w-full table-auto border border-gray-700 rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold">
              <th className="px-2 py-2">Matériau</th>
              <th className="px-2 py-2">Quantité</th>
              <th className="px-2 py-2">Prix unitaire ({currency})</th>
              <th className="px-2 py-2">Total ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(cumul).map(([mat, qte]) => (
              <tr key={mat} className="hover:bg-gray-700 transition">
                <td className="px-2 py-1">{mat}</td>
                <td className="px-2 py-1 text-right">{qte.toFixed(2)}</td>
                <td className="px-2 py-1 text-right">
                  <input 
                    value={prixUnitaires[mat] || ""} 
                    onChange={e => handlePrixUnitaireChange(mat, e.target.value)} 
                    className="w-20 p-1 bg-gray-900 rounded text-right" 
                  />
                </td>
                <td className="px-2 py-1 text-right font-bold text-green-300">{(couts[mat] || 0).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="bg-gradient-to-r from-yellow-400 to-orange-500 font-extrabold text-black">
              <td className="px-2 py-2">Total TTC</td>
              <td></td>
              <td></td>
              <td className="px-2 py-2 text-right">{totalGlobal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Graphique */}
      {Object.keys(cumul).length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mt-6 shadow-inner border border-gray-700">
          <h3 className="text-xl font-bold text-yellow-400 mb-4 text-center">📊 Répartition des matériaux</h3>
          <Doughnut data={materialsChartData} options={chartOptions} />
        </div>
      )}

      <div className="text-center mt-8 flex flex-wrap justify-center gap-4">
        <button onClick={exportToExcel} className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-2 rounded-full shadow-lg transform hover:scale-105 transition">Export Excel</button>
        <button onClick={exportToPDF} className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-full shadow-lg transform hover:scale-105 transition">Export PDF</button>
      </div>

      {/* Modal Planning */}
      {showPlanningModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border-2 border-yellow-400">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-black flex items-center gap-2">
                <CalendarIcon className="w-7 h-7" />
                Planning des Travaux
              </h2>
              <button onClick={() => setShowPlanningModal(false)} className="text-black hover:text-red-600 transition">
                <XMarkIcon className="w-8 h-8" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <button onClick={ajouterTachePlanning} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-full shadow-lg mb-4">
                <PlusIcon className="w-5 h-5" /> Ajouter une tâche
              </button>

              {planning.length === 0 ? (
                <p className="text-center text-gray-300 py-8">Aucune tâche planifiée.</p>
              ) : (
                <div className="space-y-4">
                  {planning.map((tache, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-purple-800 to-indigo-800 p-4 rounded-xl shadow-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-semibold text-yellow-300 mb-1">Ouvrage</label>
                          <select 
                            value={tache.ouvrage} 
                            onChange={e => modifierTachePlanning(idx, 'ouvrage', e.target.value)}
                            className="w-full p-2 bg-gray-900 rounded text-white"
                          >
                            <option value="">Sélectionner...</option>
                            {ouvrages.map((ouv, i) => (
                              <option key={i} value={ouv.nom}>{ouv.nom}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-yellow-300 mb-1">Date début</label>
                          <input 
                            type="date" 
                            value={tache.dateDebut}
                            onChange={e => modifierTachePlanning(idx, 'dateDebut', e.target.value)}
                            className="w-full p-2 bg-gray-900 rounded text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-yellow-300 mb-1">Date fin</label>
                          <input 
                            type="date" 
                            value={tache.dateFin}
                            onChange={e => modifierTachePlanning(idx, 'dateFin', e.target.value)}
                            className="w-full p-2 bg-gray-900 rounded text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-yellow-300 mb-1">Responsable</label>
                          <input 
                            type="text" 
                            value={tache.responsable}
                            onChange={e => modifierTachePlanning(idx, 'responsable', e.target.value)}
                            placeholder="Nom du responsable"
                            className="w-full p-2 bg-gray-900 rounded text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-yellow-300 mb-1">Statut</label>
                          <select 
                            value={tache.statut}
                            onChange={e => modifierTachePlanning(idx, 'statut', e.target.value)}
                            className="w-full p-2 bg-gray-900 rounded text-white"
                          >
                            <option value="À faire">À faire</option>
                            <option value="En cours">En cours</option>
                            <option value="Terminé">Terminé</option>
                            <option value="En pause">En pause</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button 
                            onClick={() => supprimerTachePlanning(idx)}
                            className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg"
                          >
                            <TrashIcon className="w-5 h-5" /> Supprimer
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-yellow-300 mb-1">Notes</label>
                        <textarea 
                          value={tache.notes}
                          onChange={e => modifierTachePlanning(idx, 'notes', e.target.value)}
                          placeholder="Notes et remarques..."
                          className="w-full p-2 bg-gray-900 rounded text-white h-20 resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-purple-800 to-indigo-800 p-4 flex flex-wrap justify-center gap-3 border-t-2 border-yellow-400">
              <button onClick={exportPlanningToExcel} className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-2 rounded-full shadow-lg transform hover:scale-105 transition font-bold">
                📊 Export Excel
              </button>
              <button onClick={exportPlanningToPDF} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full shadow-lg transform hover:scale-105 transition font-bold">
                📄 Export PDF
              </button>
              <button onClick={() => setShowPlanningModal(false)} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-full shadow-lg">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}