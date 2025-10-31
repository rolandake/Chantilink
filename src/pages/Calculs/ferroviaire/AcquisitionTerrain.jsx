import React from 'react';
// src/pages/Calculs/ferroviaire/forms/AcquisitionTerrain.jsx
import { useState, useEffect } from 'react';

const STORAGE_KEY = "acquisition-terrain-history";

export default function AcquisitionTerrain({ onStatusChange = () => {} }) {
  const [surface, setSurface] = useState("");
  const [coutParM2, setCoutParM2] = useState("");
  const [delaiPrevu, setDelaiPrevu] = useState("");
  const [etat, setEtat] = useState("Non commencé");
  const [historique, setHistorique] = useState([]);

  const total = (parseFloat(surface) || 0) * (parseFloat(coutParM2) || 0);

  useEffect(() => {
    onStatusChange(etat);
  }, [etat]);

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

  const handleSave = () => {
    if (!surface || !coutParM2 || !delaiPrevu) {
      alert("⚠️ Veuillez remplir tous les champs.");
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      surface,
      coutParM2,
      delaiPrevu,
      etat,
      total: total.toFixed(2),
    };

    setHistorique([entry, ...historique]);
    alert("✅ Acquisition du terrain sauvegardée !");
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
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🌍 Acquisition du terrain</h2>

      <div className="grid grid-cols-1 gap-5 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Surface (m²)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={surface}
            onInput={(e) => setSurface(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Ex : 1500"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">Coût par m² (XOF)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={coutParM2}
            onInput={(e) => setCoutParM2(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Ex : 5000"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">Délai prévu</label>
          <input
            type="text"
            value={delaiPrevu}
            onInput={(e) => setDelaiPrevu(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Ex : 2 mois"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">État</label>
          <select
            value={etat}
            onInput={(e) => setEtat(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
          >
            <option>Non commencé</option>
            <option>En cours</option>
            <option>Terminé</option>
            <option>En pause</option>
          </select>
        </div>
      </div>

      <div className="text-right mb-6">
        <p className="text-lg font-bold text-orange-400">
          💰 Total : {total.toLocaleString()} XOF
        </p>
      </div>

      <div className="flex gap-3 justify-center mb-6 flex-wrap">
        <button
          onClick={handleSave}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold shadow"
        >
          💾 Enregistrer
        </button>
        <button
          onClick={clearHistorique}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold shadow"
        >
          🧹 Effacer l'historique
        </button>
      </div>

      {historique.length > 0 && (
        <section
          className="max-h-80 overflow-y-auto bg-gray-800 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700"
        >
          <h3 className="text-lg font-bold text-orange-400 mb-3 text-center">🕓 Historique</h3>
          {historique.map((item) => (
            <div
              key={item.id}
              className="bg-gray-700 rounded-md p-3 mb-3 flex justify-between items-center text-sm"
            >
              <div className="space-y-1">
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p>Surface : {item.surface} m²</p>
                <p>Coût par m² : {item.coutParM2} XOF</p>
                <p>Délai prévu : {item.delaiPrevu}</p>
                <p>État : {item.etat}</p>
                <p className="font-bold text-orange-300">Total : {item.total} XOF</p>
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


