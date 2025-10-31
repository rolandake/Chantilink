import React, { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useCalculator } from "../../../../shared/hooks/useCalculator.js";
import { AccotementsCalculator } from "@/domains/tp/calculators/AccotementsCalculator.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function AccotementsForm({ currency = "FCFA", onCostChange = () => {}, onMateriauxChange = () => {} }) {
  const {
    inputs,
    results,
    updateInput,
    history,
    saveToHistory,
    deleteFromHistory,
    clearHistory,
  } = useCalculator(AccotementsCalculator, "accotements", "tp");

  const [message, setMessage] = useState("");

  // Mettre à jour les coûts et matériaux uniquement quand results change
  useEffect(() => {
    onCostChange(results?.total ?? 0);
    onMateriauxChange({
      cimentT: results?.cimentT ?? 0,
      sableT: results?.sableT ?? 0,
      gravierT: results?.gravierT ?? 0,
      eauL: results?.eauL ?? 0,
    });
  }, [results, onCostChange, onMateriauxChange]);

  const handleChange = (field) => (e) => updateInput(field, parseFloat(e.target.value) || 0);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2500);
  };

  const handleSave = () => {
    if (!results || !results.volume) return alert("⚠️ Veuillez entrer des dimensions valides.");
    if (saveToHistory()) showMessage("✅ Calcul sauvegardé !");
    else showMessage("❌ Impossible de sauvegarder");
  };

  const handleDelete = (id) => {
    if (deleteFromHistory(id)) showMessage("🗑️ Entrée supprimée !");
  };

  const handleClearHistory = () => {
    if (clearHistory()) showMessage("🧹 Historique vidé !");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-xl shadow-lg text-gray-100 font-sans relative">
      <h2 className="text-3xl font-extrabold text-orange-400 mb-6 text-center border-b border-gray-700 pb-2">
        🛣️ Accotements
      </h2>

      {message && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg animate-fadeinout z-50">
          {message}
        </div>
      )}

      {/* Formulaire */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        {[
          { name: "longueur", label: "Longueur (m)", placeholder: "Ex : 100" },
          { name: "largeur", label: "Largeur (m)", placeholder: "Ex : 2" },
          { name: "epaisseur", label: "Épaisseur (m)", placeholder: "Ex : 0.2" },
          { name: "prixUnitaire", label: `Prix unitaire (${currency}/m³)`, placeholder: "Ex : 6000" },
          { name: "coutMainOeuvre", label: `Coût main d'œuvre (${currency})`, placeholder: "Ex : 45000", full: true },
        ].map(({ name, label, placeholder, full }) => (
          <div className={full ? "col-span-2" : ""} key={name}>
            <label className="block mb-1 font-semibold text-orange-300">{label}</label>
            <input
              type="number"
              step="any"
              min="0"
              value={inputs[name] || ""}
              onChange={handleChange(name)}
              placeholder={placeholder}
              className="w-full px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        ))}
      </div>

      {/* Résultats */}
      <div className="bg-gray-800 rounded-xl p-5 mb-6 text-white space-y-2 shadow-lg border border-orange-500/30">
        <p>📦 Volume : {results?.volume?.toFixed(3) ?? 0} m³</p>
        <p>⚖️ Ciment : {results?.cimentT?.toFixed(2) ?? 0} t</p>
        <p>⚖️ Sable : {results?.sableT?.toFixed(2) ?? 0} t</p>
        <p>⚖️ Gravier : {results?.gravierT?.toFixed(2) ?? 0} t</p>
        <p>💧 Eau : {results?.eauL?.toFixed(0) ?? 0} L</p>
        <p className="text-2xl font-bold text-orange-400">💰 Total : {results?.total?.toLocaleString() ?? 0} {currency}</p>
      </div>

      {/* Graphique */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-6 shadow-inner border border-gray-700">
        <h3 className="text-xl font-bold text-yellow-400 mb-4 text-center">📊 Répartition des matériaux</h3>
        <Doughnut
          data={{
            labels: ["Ciment (t)", "Sable (t)", "Gravier (t)", "Eau (L)"],
            datasets: [
              {
                label: "Quantités",
                data: [results?.cimentT ?? 0, results?.sableT ?? 0, results?.gravierT ?? 0, results?.eauL ?? 0],
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
          }}
          options={{
            responsive: true,
            plugins: {
              legend: { position: "bottom", labels: { color: "#FFD700", font: { weight: "bold" } } },
              tooltip: {
                callbacks: {
                  label: (tooltipItem) => {
                    const value = tooltipItem.raw;
                    return tooltipItem.label === "Eau (L)" ? `${value.toFixed(0)} L` : `${value.toFixed(2)} t`;
                  },
                },
              },
            },
          }}
        />
      </div>

      {/* Boutons */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <button onClick={handleSave} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold shadow-md">
          💾 Sauvegarder
        </button>
        <button onClick={handleClearHistory} className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold shadow-md">
          🧹 Vider l'historique
        </button>
      </div>

      {/* Historique */}
      {history.length > 0 && (
        <section className="max-h-80 overflow-y-auto bg-gray-800 rounded-xl p-4 shadow-inner border border-gray-700 space-y-3">
          <h3 className="text-xl font-bold text-orange-400 mb-3 text-center">🕓 Historique</h3>
          {history.map((item) => (
            <div key={item.id} className="bg-gray-700 rounded-xl p-4 flex justify-between items-start text-sm text-gray-100">
              <div className="space-y-1 max-w-[85%]">
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p>Volume : {item.results.volume?.toFixed(3) ?? 0} m³</p>
                <p>Ciment : {item.results.cimentT?.toFixed(2) ?? 0} t</p>
                <p>Sable : {item.results.sableT?.toFixed(2) ?? 0} t</p>
                <p>Gravier : {item.results.gravierT?.toFixed(2) ?? 0} t</p>
                <p>Eau : {item.results.eauL?.toFixed(0) ?? 0} L</p>
                <p className="font-bold text-orange-300">Total : {item.results.total?.toLocaleString() ?? 0} {currency}</p>
              </div>
              <button onClick={() => handleDelete(item.id)} className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded-xl text-white font-bold text-xs">
                ✖
              </button>
            </div>
          ))}
        </section>
      )}

      <style>{`
        @keyframes fadeinout {0%,100%{opacity:0;}10%,90%{opacity:1;}}
        .animate-fadeinout {animation: fadeinout 2.5s ease forwards;}
      `}</style>
    </div>
  );
}
