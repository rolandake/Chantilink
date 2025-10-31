import React from 'react';
// src/pages/Calculs/ferroviaire/forms/EvaluationImpact.jsx
import { useState, useEffect } from 'react';

const STORAGE_KEY = "evaluation-impact-history";

export default function EvaluationImpact({ onStatusChange = () => {} }) {
  const [description, setDescription] = useState("");
  const [mesuresMitigation, setMesuresMitigation] = useState("");
  const [recommandations, setRecommandations] = useState("");
  const [etat, setEtat] = useState("Non commencé");
  const [historique, setHistorique] = useState([]);

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
    if (!description.trim()) {
      alert("⚠️ Veuillez saisir une description de l’impact.");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      description,
      mesuresMitigation,
      recommandations,
      etat,
    };
    setHistorique([entry, ...historique]);
    alert("✅ Évaluation de l’impact sauvegardée !");
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
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🌍 Évaluation Impact</h2>

      <div className="grid grid-cols-1 gap-5 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Description de l’impact</label>
          <textarea
            rows="4"
            value={description}
            onInput={(e) => setDescription(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Décrire les impacts environnementaux, sociaux, économiques..."
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">Mesures de mitigation</label>
          <textarea
            rows="3"
            value={mesuresMitigation}
            onInput={(e) => setMesuresMitigation(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Actions prévues pour réduire l’impact"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">Recommandations</label>
          <textarea
            rows="3"
            value={recommandations}
            onInput={(e) => setRecommandations(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Conseils ou recommandations supplémentaires"
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
                <p><strong>Description :</strong> {item.description}</p>
                <p><strong>Mesures de mitigation :</strong> {item.mesuresMitigation}</p>
                <p><strong>Recommandations :</strong> {item.recommandations}</p>
                <p><strong>État :</strong> {item.etat}</p>
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


