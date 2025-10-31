import React from 'react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = "eau-history";

export default function EauEco({ currency = "XOF", onTotalChange = () => {}, onMaterialsChange = () => {} }) {
  const [consommation, setConsommation] = useState(""); // en m3
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);

  const total = (parseFloat(consommation) || 0) * (parseFloat(prixUnitaire) || 0) + (parseFloat(coutMainOeuvre) || 0);

  useEffect(() => {
    onTotalChange(total);
  }, [total]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setHistorique(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historique));
  }, [historique]);

  const handleSave = () => {
    if (!consommation || total === 0) {
      alert("⚠️ Veuillez saisir une consommation et un prix valides.");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      consommation,
      prixUnitaire,
      coutMainOeuvre,
      total: total.toFixed(2),
    };
    setHistorique([entry, ...historique]);
    alert("✅ Calcul sauvegardé !");
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

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">💧 Eau</h2>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {[
          { label: "Consommation (m³)", value: consommation, setter: setConsommation },
          { label: `Prix unitaire (${currency}/m³)`, value: prixUnitaire, setter: setPrixUnitaire },
          { label: `Coût main d'œuvre (${currency})`, value: coutMainOeuvre, setter: setCoutMainOeuvre, full: true },
        ].map(({ label, value, setter, full }, idx) => (
          <div className={full ? "col-span-2" : ""} key={idx}>
            <label className="block mb-1 font-semibold text-orange-400">{label}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={value}
              onInput={(e) => setter(e.target.value)}
              className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <div className="mb-6 text-right">
        <p className="text-lg font-bold text-orange-400">
          💰 Total : {total.toLocaleString()} {currency}
        </p>
      </div>

      <div className="flex gap-3 justify-center mb-6 flex-wrap">
        <button onClick={handleSave} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold shadow">
          💾 Enregistrer
        </button>
        <button onClick={clearHistorique} className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold shadow">
          🧹 Effacer l'historique
        </button>
      </div>

      {historique.length > 0 && (
        <section className="max-h-80 overflow-y-auto bg-gray-800 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
          <h3 className="text-lg font-bold text-orange-400 mb-3 text-center">🕓 Historique</h3>
          {historique.map((item) => (
            <div key={item.id} className="bg-gray-700 rounded-md p-3 mb-3 flex justify-between items-center text-sm">
              <div className="space-y-1">
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p>Consommation : {item.consommation} m³</p>
                <p className="font-bold text-orange-300">
                  Total : {item.total} {currency}
                </p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="ml-4 px-2 py-1 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold"
              >
                ✖
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}


