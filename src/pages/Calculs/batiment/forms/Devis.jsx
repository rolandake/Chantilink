import React, { useState, useEffect, useMemo } from 'react';
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Plus, Trash2, Calendar, X, Save, Download } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend);

const STORAGE_KEY_DEVIS = "devis-dynamique-data";
const STORAGE_KEY_PLANNING = "devis-planning-data";

const ouvragesInit = [
  { nom: "Fondation", materiaux: ["Ciment", "Sable", "Gravier", "Acier", "Eau"] },
  { nom: "Murs", materiaux: ["Parpaing", "Ciment", "Sable", "Acier", "Eau"] },
  { nom: "Planchers", materiaux: ["Béton", "Acier", "Sable", "Gravier", "Ciment"] },
  { nom: "Toiture", materiaux: ["Bois", "Tuiles", "Acier", "Ciment"] },
  { nom: "Finitions", materiaux: ["Peinture", "Plâtre", "Carrelage", "Bois"] },
];

export default function DevisDynamique({ currency = "XOF" }) {
  // ✅ Chargement depuis localStorage au démarrage
  const [ouvrages, setOuvrages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DEVIS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.ouvrages || ouvragesInit.map(({ nom, materiaux }) => ({
          nom,
          materiaux: materiaux.map((m) => ({ nom: m, quantite: "" })),
        }));
      }
    } catch (e) {
      console.error("Erreur chargement localStorage:", e);
    }
    return ouvragesInit.map(({ nom, materiaux }) => ({
      nom,
      materiaux: materiaux.map((m) => ({ nom: m, quantite: "" })),
    }));
  });

  const [prixUnitaires, setPrixUnitaires] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DEVIS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.prixUnitaires) return parsed.prixUnitaires;
      }
    } catch (e) {
      console.error("Erreur chargement prix:", e);
    }
    const mats = new Set();
    ouvragesInit.forEach(({ materiaux }) => materiaux.forEach((m) => mats.add(m.toLowerCase())));
    const obj = {};
    mats.forEach((m) => (obj[m] = ""));
    return obj;
  });

  const [planning, setPlanning] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLANNING);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Erreur chargement planning:", e);
    }
    return [];
  });

  const [showPlanningModal, setShowPlanningModal] = useState(false);
  const [message, setMessage] = useState("");

  // ✅ Sauvegarde automatique avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_DEVIS, JSON.stringify({ ouvrages, prixUnitaires }));
      } catch (e) {
        console.error("Erreur sauvegarde:", e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [ouvrages, prixUnitaires]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_PLANNING, JSON.stringify(planning));
      } catch (e) {
        console.error("Erreur sauvegarde planning:", e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [planning]);

  // ✅ Calculs optimisés avec useMemo
  const { cumul, couts, totalGlobal } = useMemo(() => {
    const newCumul = {};
    ouvrages.forEach(({ materiaux }) => 
      materiaux.forEach(({ nom, quantite }) => {
        const mLower = nom.toLowerCase();
        const qte = parseFloat(quantite || 0) || 0;
        newCumul[mLower] = (newCumul[mLower] || 0) + qte;
      })
    );
    
    const newCouts = {};
    Object.keys(newCumul).forEach(m => {
      const q = newCumul[m];
      const pu = parseFloat(prixUnitaires[m] || 0) || 0;
      newCouts[m] = q * pu;
    });
    
    const total = Object.values(newCouts).reduce((a, b) => a + b, 0);
    
    return { cumul: newCumul, couts: newCouts, totalGlobal: total };
  }, [ouvrages, prixUnitaires]);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleQuantiteChange = (idx, mat, val) => {
    setOuvrages(prev => {
      const copy = [...prev];
      copy[idx].materiaux = copy[idx].materiaux.map(m => 
        m.nom === mat ? { ...m, quantite: val } : m
      );
      return copy;
    });
  };
  
  const handlePrixUnitaireChange = (mat, val) => {
    setPrixUnitaires(prev => ({ ...prev, [mat]: val }));
  };

  const ajouterOuvrage = () => {
    const nom = prompt("Nom du nouvel ouvrage :");
    if (!nom?.trim()) return;
    if (ouvrages.some(o => o.nom.toLowerCase() === nom.trim().toLowerCase())) {
      return alert("❌ Nom déjà existant");
    }
    setOuvrages(prev => [...prev, { nom: nom.trim(), materiaux: [] }]);
    showMessage("✅ Ouvrage ajouté !");
  };
  
  const supprimerOuvrage = idx => { 
    if (confirm(`Supprimer "${ouvrages[idx].nom}" ?`)) {
      setOuvrages(prev => prev.filter((_, i) => i !== idx));
      showMessage("🗑️ Ouvrage supprimé !");
    }
  };
  
  const ajouterMateriauDansOuvrage = idx => {
    const nomMat = prompt("Nom du matériau :");
    if (!nomMat?.trim()) return;
    
    setOuvrages(prev => {
      const copy = [...prev];
      const matLower = nomMat.toLowerCase();
      
      if (copy[idx].materiaux.some(m => m.nom.toLowerCase() === matLower)) {
        alert("❌ Matériau déjà existant dans cet ouvrage");
        return prev;
      }
      
      copy[idx].materiaux.push({ nom: nomMat.trim(), quantite: "" });
      return copy;
    });
    
    const matLower = nomMat.toLowerCase();
    if (!(matLower in prixUnitaires)) {
      setPrixUnitaires(prev => ({ ...prev, [matLower]: "" }));
    }
    showMessage("✅ Matériau ajouté !");
  };
  
  const supprimerMateriauDansOuvrage = (idx, mat) => { 
    if (confirm(`Supprimer "${mat}" ?`)) {
      setOuvrages(prev => { 
        const c = [...prev]; 
        c[idx].materiaux = c[idx].materiaux.filter(m => m.nom !== mat); 
        return c; 
      });
      showMessage("🗑️ Matériau supprimé !");
    }
  };

  const reinitialiserDevis = () => {
    if (!confirm("⚠️ Réinitialiser tout le devis ? Cette action est irréversible !")) return;
    
    setOuvrages(ouvragesInit.map(({ nom, materiaux }) => ({
      nom,
      materiaux: materiaux.map(m => ({ nom: m, quantite: "" }))
    })));
    
    const mats = new Set();
    ouvragesInit.forEach(({ materiaux }) => materiaux.forEach((m) => mats.add(m.toLowerCase())));
    const obj = {};
    mats.forEach((m) => (obj[m] = ""));
    setPrixUnitaires(obj);
    
    showMessage("🧹 Devis réinitialisé !");
  };

  const exportToExcel = () => {
    try {
      const data = [];
      ouvrages.forEach(({ nom, materiaux }) => 
        materiaux.forEach(({ nom: mat, quantite }, i) => 
          data.push({
            Ouvrage: i === 0 ? nom : "",
            Matériau: mat,
            Quantité: quantite || 0,
            "Prix unitaire": prixUnitaires[mat.toLowerCase()] || 0,
            Total: ((parseFloat(quantite || 0) * parseFloat(prixUnitaires[mat.toLowerCase()] || 0))).toFixed(2)
          })
        )
      );
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Détail");
      
      const cumulData = Object.keys(cumul).map(m => ({
        Matériau: m,
        Quantité: cumul[m].toFixed(2),
        "Prix unitaire": prixUnitaires[m] || 0,
        Total: couts[m].toFixed(2),
        Devise: currency
      }));
      cumulData.push({ 
        Matériau: "Total TTC", 
        Quantité: "", 
        "Prix unitaire": "", 
        Total: totalGlobal.toFixed(2), 
        Devise: currency 
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cumulData), "Cumul");
      
      XLSX.writeFile(wb, `devis_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`);
      showMessage("📊 Fichier Excel exporté !");
    } catch (e) {
      alert("❌ Erreur lors de l'export Excel");
      console.error(e);
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const w = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(20);
      doc.text("Devis Bâtiment", w / 2, 20, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleDateString("fr-FR")}`, w / 2, 28, { align: "center" });
      
      doc.setFontSize(14);
      doc.text("1. Détail par ouvrage", 14, 38);
      
      const body = [];
      ouvrages.forEach(({ nom, materiaux }) => 
        materiaux.forEach(({ nom: mat, quantite }, i) => 
          body.push([
            i === 0 ? nom : "", 
            mat, 
            quantite || "0",
            prixUnitaires[mat.toLowerCase()] || "0",
            ((parseFloat(quantite || 0) * parseFloat(prixUnitaires[mat.toLowerCase()] || 0))).toFixed(2)
          ])
        )
      );
      
      doc.autoTable({
        startY: 43,
        head: [["Ouvrage", "Matériau", "Quantité", `Prix (${currency})`, `Total (${currency})`]],
        body,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [255, 165, 0] }
      });
      
      let y = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text("2. Cumul global", 14, y);
      
      const cumulBody = Object.keys(cumul).map(m => [
        m,
        cumul[m].toFixed(2),
        prixUnitaires[m] || "0",
        couts[m]?.toFixed(2) || "0.00"
      ]);
      cumulBody.push(["Total TTC", "", "", totalGlobal.toFixed(2)]);
      
      doc.autoTable({
        startY: y + 5,
        head: [["Matériau", "Quantité", `Prix unitaire (${currency})`, `Total (${currency})`]],
        body: cumulBody,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [255, 165, 0] },
        footStyles: { fillColor: [255, 200, 0], fontStyle: 'bold' }
      });
      
      doc.save(`devis_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.pdf`);
      showMessage("📄 PDF exporté !");
    } catch (e) {
      alert("❌ Erreur lors de l'export PDF");
      console.error(e);
    }
  };

  // Fonctions Planning
  const ajouterTachePlanning = () => {
    setPlanning(prev => [...prev, { 
      ouvrage: "", 
      dateDebut: "", 
      dateFin: "", 
      responsable: "", 
      statut: "À faire",
      notes: ""
    }]);
    showMessage("✅ Tâche ajoutée au planning !");
  };

  const supprimerTachePlanning = (idx) => {
    if (confirm("Supprimer cette tâche ?")) {
      setPlanning(prev => prev.filter((_, i) => i !== idx));
      showMessage("🗑️ Tâche supprimée !");
    }
  };

  const modifierTachePlanning = (idx, field, value) => {
    setPlanning(prev => {
      const copy = [...prev];
      copy[idx][field] = value;
      return copy;
    });
  };

  const exportPlanningToExcel = () => {
    try {
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
      XLSX.writeFile(wb, `planning_batiment_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`);
      showMessage("📊 Planning exporté en Excel !");
    } catch (e) {
      alert("❌ Erreur lors de l'export du planning");
      console.error(e);
    }
  };

  const exportPlanningToPDF = () => {
    try {
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
      
      doc.save(`planning_batiment_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.pdf`);
      showMessage("📄 Planning exporté en PDF !");
    } catch (e) {
      alert("❌ Erreur lors de l'export du planning");
      console.error(e);
    }
  };

  const chartData = {
    labels: Object.keys(cumul),
    datasets: [{
      label: "Répartition",
      data: Object.values(cumul),
      backgroundColor: [
        "rgba(255,165,0,0.8)",
        "rgba(255,206,86,0.8)",
        "rgba(75,192,192,0.8)",
        "rgba(54,162,235,0.8)",
        "rgba(153,102,255,0.8)",
        "rgba(255,99,132,0.8)"
      ],
      borderColor: "#fff",
      borderWidth: 2
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#FFD700",
          font: { weight: "bold" }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${context.raw.toFixed(2)} unités`
        }
      }
    },
    animation: {
      animateScale: true,
      animateRotate: true
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-pink-900 via-purple-900 to-indigo-900 min-h-screen text-white">
      <h1 className="text-4xl font-extrabold text-center mb-6 text-yellow-400 drop-shadow-lg">
        💰 Devis Bâtiment Dynamique
      </h1>
      
      {/* ✅ Message de notification */}
      {message && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-5 py-3 rounded-xl shadow-2xl animate-bounce z-50">
          {message}
        </div>
      )}
      
      <div className="flex flex-wrap justify-end gap-3 mb-6">
        <button 
          onClick={() => setShowPlanningModal(true)} 
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 px-5 py-2 rounded-full shadow-lg transform hover:scale-105 transition font-semibold"
        >
          <Calendar className="w-5 h-5"/> Planning
        </button>
        <button 
          onClick={ajouterOuvrage} 
          className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 px-5 py-2 rounded-full shadow-lg transform hover:scale-105 transition font-semibold"
        >
          <Plus className="w-5 h-5"/> Ajouter Ouvrage
        </button>
        <button 
          onClick={reinitialiserDevis} 
          className="bg-red-500 hover:bg-red-600 px-5 py-2 rounded-full shadow-lg font-semibold"
        >
          Réinitialiser
        </button>
      </div>

      {ouvrages.map(({ nom, materiaux }, idx) => (
        <section key={idx} className="mb-6 bg-gradient-to-r from-purple-800 to-indigo-800 p-4 rounded-2xl shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-2xl font-semibold text-yellow-300">{nom}</h2>
            <button 
              onClick={() => supprimerOuvrage(idx)} 
              className="flex items-center gap-1 text-red-400 hover:text-red-600 transition"
            >
              <Trash2 className="w-5 h-5"/> Supprimer
            </button>
          </div>
          <button 
            onClick={() => ajouterMateriauDansOuvrage(idx)} 
            className="flex items-center gap-1 text-green-300 hover:text-green-400 mb-3 transition"
          >
            <Plus className="w-4 h-4"/> Ajouter matériau
          </button>
          <div className="overflow-x-auto">
            <table className="w-full table-auto border border-gray-700 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold">
                  <th className="px-2 py-2">Matériau</th>
                  <th className="px-2 py-2">Quantité</th>
                  <th className="px-2 py-2">Prix unitaire ({currency})</th>
                  <th className="px-2 py-2">Total ({currency})</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {materiaux.map(({ nom: mat, quantite }) => {
                  const ml = mat.toLowerCase();
                  const q = parseFloat(quantite || 0) || 0;
                  const pu = parseFloat(prixUnitaires[ml] || 0) || 0;
                  return (
                    <tr key={mat} className="hover:bg-gray-700 transition">
                      <td className="px-2 py-1 font-semibold">{mat}</td>
                      <td className="px-2 py-1 text-right">
                        <input 
                          type="number"
                          value={quantite} 
                          onChange={e => handleQuantiteChange(idx, mat, e.target.value)} 
                          className="w-24 p-1 bg-gray-900 rounded text-right border border-gray-600 focus:border-yellow-400 focus:outline-none"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <input 
                          type="number"
                          value={prixUnitaires[ml] || ""} 
                          onChange={e => handlePrixUnitaireChange(ml, e.target.value)} 
                          className="w-24 p-1 bg-gray-900 rounded text-right border border-gray-600 focus:border-yellow-400 focus:outline-none"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1 text-right font-bold text-green-300">
                        {(q * pu).toFixed(2)}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button 
                          onClick={() => supprimerMateriauDansOuvrage(idx, mat)} 
                          className="text-red-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-5 h-5"/>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="mt-8 bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 p-4 rounded-2xl shadow-2xl">
        <h2 className="text-2xl font-bold mb-3 text-yellow-300">📊 Cumul global des matériaux</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border border-gray-700 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold">
                <th className="px-2 py-2">Matériau</th>
                <th className="px-2 py-2">Quantité totale</th>
                <th className="px-2 py-2">Prix unitaire ({currency})</th>
                <th className="px-2 py-2">Total ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(cumul).map(([mat, qte]) => (
                <tr key={mat} className="hover:bg-gray-700 transition">
                  <td className="px-2 py-1 font-semibold capitalize">{mat}</td>
                  <td className="px-2 py-1 text-right">{qte.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right">
                    <input 
                      type="number"
                      value={prixUnitaires[mat] || ""} 
                      onChange={e => handlePrixUnitaireChange(mat, e.target.value)} 
                      className="w-24 p-1 bg-gray-900 rounded text-right border border-gray-600 focus:border-yellow-400 focus:outline-none"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-1 text-right font-bold text-green-300">
                    {(couts[mat] || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gradient-to-r from-yellow-400 to-orange-500 font-extrabold text-black text-lg">
                <td className="px-2 py-3" colSpan="3">💰 Total TTC</td>
                <td className="px-2 py-3 text-right">{totalGlobal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {Object.keys(cumul).length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mt-6 shadow-inner border border-gray-700">
          <h3 className="text-xl font-bold text-yellow-400 mb-4 text-center">
            📊 Répartition des matériaux
          </h3>
          <div className="max-w-md mx-auto">
            <Doughnut data={chartData} options={chartOptions}/>
          </div>
        </div>
      )}

      <div className="text-center mt-8 flex flex-wrap justify-center gap-4">
        <button 
          onClick={exportToExcel} 
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded-full shadow-lg transform hover:scale-105 transition font-bold"
        >
          <Download className="w-5 h-5"/> Export Excel
        </button>
        <button 
          onClick={exportToPDF} 
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-full shadow-lg transform hover:scale-105 transition font-bold"
        >
          <Download className="w-5 h-5"/> Export PDF
        </button>
      </div>

      {/* Modal de Planning */}
      {showPlanningModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border-2 border-yellow-400">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-black flex items-center gap-2">
                <Calendar className="w-7 h-7"/> Planning des Travaux
              </h2>
              <button 
                onClick={() => setShowPlanningModal(false)} 
                className="text-black hover:text-red-600 transition"
              >
                <X className="w-8 h-8"/>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <button 
                onClick={ajouterTachePlanning} 
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-full shadow-lg mb-4 font-semibold"
              >
                <Plus className="w-5 h-5"/> Ajouter une tâche
              </button>

              {planning.length === 0 ? (
                <p className="text-center text-gray-300 py-8">
                  📋 Aucune tâche planifiée. Cliquez sur "Ajouter une tâche" pour commencer.
                </p>
              ) : (
                <div className="space-y-4">
                  {planning.map((tache, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-purple-800 to-indigo-800 p-4 rounded-xl shadow-lg border border-gray-600">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-semibold text-yellow-300 mb-1">Ouvrage</label>
                          <select 
                            value={tache.ouvrage} 
                            onChange={e => modifierTachePlanning(idx, 'ouvrage', e.target.value)}
                            className="w-full p-2 bg-gray-900 rounded text-white border border-gray-600 focus:border-yellow-400 focus:outline-none"
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
                            className="w-full p-2 bg-gray-900 rounded text-white border border-gray-600 focus:border-yellow-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-yellow-300 mb-1">Date fin</label>
                          <input 
                            type="date" 
                            value={tache.dateFin}
                            onChange={e => modifierTachePlanning(idx, 'dateFin', e.target.value)}
                            className="w-full p-2 bg-gray-900 rounded text-white border border-gray-600 focus:border-yellow-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-yellow-300 mb-1">Responsable</label>
                          <input 
                            type="text" 
                            value={tache.responsable}
                            onChange={e => modifierTachePlanning(idx, 'responsable', e.target.value)}
                            placeholder="Nom du responsable"
                            className="w-full p-2 bg-gray-900 rounded text-white border border-gray-600 focus:border-yellow-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-yellow-300 mb-1">Statut</label>
                          <select 
                            value={tache.statut}
                            onChange={e => modifierTachePlanning(idx, 'statut', e.target.value)}
                            className="w-full p-2 bg-gray-900 rounded text-white border border-gray-600 focus:border-yellow-400 focus:outline-none"
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
                            className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition font-semibold"
                          >
                            <Trash2 className="w-5 h-5"/> Supprimer
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-yellow-300 mb-1">Notes</label>
                        <textarea 
                          value={tache.notes}
                          onChange={e => modifierTachePlanning(idx, 'notes', e.target.value)}
                          placeholder="Notes et remarques..."
                          className="w-full p-2 bg-gray-900 rounded text-white h-20 resize-none border border-gray-600 focus:border-yellow-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-purple-800 to-indigo-800 p-4 flex flex-wrap justify-center gap-3 border-t-2 border-yellow-400">
              <button 
                onClick={exportPlanningToExcel} 
                className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-2 rounded-full shadow-lg transform hover:scale-105 transition font-bold"
                disabled={planning.length === 0}
              >
                <Download className="w-5 h-5"/> Export Excel
              </button>
              <button 
                onClick={exportPlanningToPDF} 
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full shadow-lg transform hover:scale-105 transition font-bold"
                disabled={planning.length === 0}
              >
                <Download className="w-5 h-5"/> Export PDF
              </button>
              <button 
                onClick={() => setShowPlanningModal(false)} 
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-full shadow-lg font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce {
          animation: bounce 1s ease-in-out 3;
        }
      `}</style>
    </div>
  );
}